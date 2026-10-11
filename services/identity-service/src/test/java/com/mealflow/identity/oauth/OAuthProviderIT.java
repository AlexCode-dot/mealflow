package com.mealflow.identity.oauth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.identity.audit.domain.AuditEvent;
import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.repository.AuditEventRepository;
import com.mealflow.identity.auth.PasswordService;
import com.mealflow.identity.auth.verification.VerificationCodeService;
import com.mealflow.identity.oauth.store.OAuthAuthorizationDocument;
import com.mealflow.identity.oauth.store.OAuthConsentDocument;
import com.mealflow.identity.security.jwt.AccessTokenService;
import com.mealflow.identity.support.MongoTestContainerConfig;
import com.mealflow.identity.support.TestRsaKeysConfig;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/**
 * MF1: OAuth 2.0 provider for Personal OS — authorization code + PKCE end to end through the real
 * HTTP endpoints (login page, consent page, token, revoke) against Mongo.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
class OAuthProviderIT extends MongoTestContainerConfig {

    static final String CLIENT_ID = "personal-os";
    static final String CLIENT_SECRET = "test-only-client-secret";
    static final String REDIRECT = "http://127.0.0.1:9999/callback";
    static final String PASSWORD = "VeryStrongPass123!";

    @LocalServerPort
    int port;

    @Autowired
    UserRepository users;

    @Autowired
    PasswordService passwordService;

    @Autowired
    AccessTokenService accessTokenService;

    @Autowired
    MongoTemplate mongo;

    @Autowired
    AuditEventRepository audit;

    @MockitoSpyBean
    VerificationCodeService codeService;

    final HttpClient api =
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

    User alice;

    @BeforeEach
    void setUp() {
        alice = verifiedUser("alice@mealflow.dev");
    }

    @AfterEach
    void cleanup() {
        mongo.dropCollection(OAuthAuthorizationDocument.class);
        mongo.dropCollection(OAuthConsentDocument.class);
        audit.deleteAll();
        users.deleteAll();
        mongo.dropCollection("email_verifications");
    }

    // ---------------------------------------------------------------- happy path

    @Test
    void fullCodePkceFlow_issuesScopedIntegrationToken_andStoresNoTokenValues() throws Exception {
        Pkce pkce = Pkce.create();
        Tokens t = connect(alice, "recipes.read mealplan.read", pkce);

        Map<String, Object> claims = claims(t.access);
        assertThat(claims.get("sub"), is(alice.getId()));
        // RFC 7519: a single audience may be serialized as a string or a one-element array.
        Object aud = claims.get("aud");
        assertThat(aud instanceof List<?> l ? l : List.of(aud), contains("mealflow-integrations"));
        assertThat(claims.get("client_id"), is(CLIENT_ID));
        assertThat((List<?>) claims.get("scope"), containsInAnyOrder("recipes.read", "mealplan.read"));
        assertThat(claims.get("gid"), notNullValue());
        long ttl = ((Number) claims.get("exp")).longValue() - ((Number) claims.get("iat")).longValue();
        assertThat(ttl, lessThanOrEqualTo(300L));
        assertThat(List.of(t.scope.split(" ")), containsInAnyOrder("recipes.read", "mealplan.read"));

        // Grant persisted under the gid, no raw token values at rest.
        Document grant = mongo.getCollection("oauth2_authorizations")
                .find(new Document("_id", claims.get("gid")))
                .first();
        assertThat(grant, notNullValue());
        assertThat(grant.getString("principalName"), is(alice.getId()));
        assertThat(grant.getBoolean("revoked"), is(false));
        String raw = grant.toJson();
        assertThat(raw, not(containsString(t.access)));
        assertThat(raw, not(containsString(t.refresh)));

        // Audit: consent + token issuance, without token values.
        List<AuditEvent> events = audit.findAll();
        assertThat(
                events.stream().map(AuditEvent::getEventType).toList(),
                hasItems(AuditEventType.OAUTH_CONSENT_GRANTED, AuditEventType.OAUTH_TOKEN_ISSUED));
        for (AuditEvent e : events) {
            String meta = String.valueOf(e.getMetadata());
            assertThat(meta, not(containsString(t.access)));
            assertThat(meta, not(containsString(t.refresh)));
        }
    }

    @Test
    void integrationToken_isRejectedByFirstPartyApi() throws Exception {
        Tokens t = connect(alice, "recipes.read", Pkce.create());
        HttpResponse<String> me = api.send(
                HttpRequest.newBuilder(uri("/auth/me"))
                        .header("Authorization", "Bearer " + t.access)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(me.statusCode(), is(401));

        HttpResponse<String> delete = api.send(
                HttpRequest.newBuilder(uri("/account"))
                        .header("Authorization", "Bearer " + t.access)
                        .DELETE()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(delete.statusCode(), is(401));
        assertThat(users.findById(alice.getId()).isPresent(), is(true));
    }

    // ---------------------------------------------------------------- PKCE / redirect

    @Test
    void authorizeWithoutPkce_isRefused() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> res = b.get(authorizeUrl("recipes.read", null, null, REDIRECT));
        assertRefusedWithError(res, "invalid_request");
    }

    @Test
    void authorizeWithPlainPkce_isRefused() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> res =
                b.get(authorizeUrl("recipes.read", "plain-challenge-plain-challenge-plain-1234", "plain", REDIRECT));
        assertRefusedWithError(res, "invalid_request");
    }

    @Test
    void authorizeWithUnregisteredRedirect_isRefusedWithoutRedirecting() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> res =
                b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", "https://evil.example/cb"));
        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("Location").orElse(""), not(containsString("evil.example")));
    }

    @Test
    void tokenExchangeWithWrongVerifier_isRefused() throws Exception {
        Pkce pkce = Pkce.create();
        String code = authorize(loggedInBrowser(alice), "recipes.read", pkce);
        HttpResponse<String> res = token(Map.of(
                "grant_type",
                "authorization_code",
                "code",
                code,
                "redirect_uri",
                REDIRECT,
                "code_verifier",
                Pkce.create().verifier));
        assertThat(res.statusCode(), is(400));
        assertThat(JsonPath.read(res.body(), "$.error"), is("invalid_grant"));
    }

    @Test
    void replayedCode_isRefused_andRevokesTokensIssuedWithIt() throws Exception {
        Pkce pkce = Pkce.create();
        String code = authorize(loggedInBrowser(alice), "recipes.read", pkce);
        Tokens first = exchange(code, pkce);

        HttpResponse<String> replay = token(Map.of(
                "grant_type",
                "authorization_code",
                "code",
                code,
                "redirect_uri",
                REDIRECT,
                "code_verifier",
                pkce.verifier));
        assertThat(replay.statusCode(), is(400));
        assertThat(JsonPath.read(replay.body(), "$.error"), is("invalid_grant"));

        assertThat(refresh(first.refresh).statusCode(), is(400));
        String gid = (String) claims(first.access).get("gid");
        assertThat(grantDoc(gid).getBoolean("revoked"), is(true));
    }

    // ---------------------------------------------------------------- refresh rotation

    @Test
    void refresh_rotates_andReuseOfOldTokenRevokesTheWholeFamily() throws Exception {
        Tokens t = connect(alice, "recipes.read", Pkce.create());
        String gid = (String) claims(t.access).get("gid");

        HttpResponse<String> r1 = refresh(t.refresh);
        assertThat(r1.statusCode(), is(200));
        String rotated = JsonPath.read(r1.body(), "$.refresh_token");
        String newAccess = JsonPath.read(r1.body(), "$.access_token");
        assertThat(rotated, not(is(t.refresh)));
        assertThat(claims(newAccess).get("gid"), is(gid));

        // Reuse of the rotated-out refresh token = leak signal.
        HttpResponse<String> reuse = refresh(t.refresh);
        assertThat(reuse.statusCode(), is(400));
        assertThat(JsonPath.read(reuse.body(), "$.error"), is("invalid_grant"));

        // ...which revokes the family: the newest refresh token is dead too, grant is gone.
        assertThat(refresh(rotated).statusCode(), is(400));
        assertThat(grantDoc(gid), nullValue());
        assertThat(
                audit.findAll().stream().map(AuditEvent::getEventType).toList(),
                hasItem(AuditEventType.TOKEN_REUSE_DETECTED));
    }

    @Test
    void revokeEndpoint_invalidatesRefreshToken_andMarksGrantRevoked() throws Exception {
        Tokens t = connect(alice, "recipes.read", Pkce.create());
        HttpResponse<String> revoke = api.send(
                HttpRequest.newBuilder(uri("/oauth2/revoke"))
                        .header("Authorization", basicAuth())
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                form(Map.of("token", t.refresh, "token_type_hint", "refresh_token"))))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(revoke.statusCode(), is(200));
        assertThat(refresh(t.refresh).statusCode(), is(400));
        assertThat(grantDoc((String) claims(t.access).get("gid")).getBoolean("revoked"), is(true));
    }

    @Test
    void revokeEndpoint_requiresClientAuthentication() throws Exception {
        Tokens t = connect(alice, "recipes.read", Pkce.create());
        HttpResponse<String> revoke = api.send(
                HttpRequest.newBuilder(uri("/oauth2/revoke"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form(Map.of("token", t.refresh))))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(revoke.statusCode(), is(401));
        assertThat(refresh(t.refresh).statusCode(), is(200));
    }

    // ---------------------------------------------------------------- consent

    @Test
    void consentDeny_redirectsWithAccessDenied_andIssuesNothing() throws Exception {
        Browser b = loggedInBrowser(alice);
        Pkce pkce = Pkce.create();
        HttpResponse<String> toConsent = b.get(authorizeUrl("recipes.read", pkce.challenge, "S256", REDIRECT));
        assertThat(toConsent.statusCode(), is(302));
        HttpResponse<String> page = b.get(absolute(location(toConsent)));
        String state = hidden(page.body(), "state");

        HttpResponse<String> denied = b.postForm("/oauth2/authorize", Map.of("client_id", CLIENT_ID, "state", state));
        assertThat(denied.statusCode(), is(302));
        String loc = location(denied);
        assertThat(loc, startsWith(REDIRECT));
        assertThat(loc, containsString("error=access_denied"));
        assertThat(loc, not(containsString("code=")));
        assertThat(mongo.findAll(OAuthConsentDocument.class), empty());
    }

    @Test
    void consentPage_namesEachScope_inSwedishAndEnglish() throws Exception {
        Browser b = loggedInBrowser(alice);
        String all = "recipes.read recipes.write mealplan.read mealplan.write shoppinglist.read shoppinglist.write";

        HttpResponse<String> toConsent = b.get(authorizeUrl(all, Pkce.create().challenge, "S256", REDIRECT));
        String consentUrl = absolute(location(toConsent));

        String sv = b.get(consentUrl, "sv-SE,sv;q=0.9").body();
        assertThat(sv, containsString("Koppla Personal OS till MealFlow"));
        assertThat(sv, containsString("Se dina recept"));
        assertThat(sv, containsString("Lägga till och ta bort måltider i din matplanering"));
        assertThat(sv, containsString("bocka av varor på dina inköpslistor"));
        assertThat(sv, containsString("Neka"));

        String en = b.get(consentUrl, "en-US,en;q=0.9").body();
        assertThat(en, containsString("Connect Personal OS to MealFlow"));
        assertThat(en, containsString("See your recipes"));
        assertThat(en, containsString("Deny"));
    }

    @Test
    void unauthenticatedAuthorize_redirectsToMealFlowLogin_wrongPasswordStaysOnLogin() throws Exception {
        Browser b = new Browser();
        HttpResponse<String> res = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        assertThat(res.statusCode(), is(302));
        assertThat(location(res), endsWith("/oauth/login"));

        HttpResponse<String> bad = b.login("alice@mealflow.dev", "wrong-password");
        assertThat(location(bad), endsWith("/oauth/login?error"));
    }

    @Test
    void newUser_canSignUp_verifyByCode_andConnect() throws Exception {
        Mockito.doReturn("246810").when(codeService).generate();
        Browser b = new Browser();
        Pkce pkce = Pkce.create();
        b.get(authorizeUrl("recipes.read", pkce.challenge, "S256", REDIRECT)); // saves the request

        b.get(absolute("/oauth/signup"));
        HttpResponse<String> signup =
                b.postForm("/oauth/signup", Map.of("email", "new.user@mealflow.dev", "password", PASSWORD));
        assertThat(signup.statusCode(), is(302));
        assertThat(location(signup), endsWith("/oauth/verify"));

        b.get(absolute("/oauth/verify"));
        HttpResponse<String> verified = b.postForm("/oauth/verify", Map.of("code", "246810"));
        assertThat(verified.statusCode(), is(302));
        assertThat(location(verified), containsString("/oauth2/authorize"));

        HttpResponse<String> toConsent = b.get(absolute(location(verified)));
        assertThat(location(toConsent), containsString("/oauth2/consent"));
        String code = approve(b, absolute(location(toConsent)), List.of("recipes.read"));
        Tokens t = exchange(code, pkce);
        User created = users.findByEmail("new.user@mealflow.dev").orElseThrow();
        assertThat(claims(t.access).get("sub"), is(created.getId()));
    }

    // ---------------------------------------------------------------- account connections

    @Test
    void userCanListAndRevokeConnection_fromMealFlowAccount() throws Exception {
        Tokens t = connect(alice, "recipes.read shoppinglist.write", Pkce.create());
        String appToken = accessTokenService.issue(alice.getId());

        HttpResponse<String> list = api.send(
                HttpRequest.newBuilder(uri("/account/connections"))
                        .header("Authorization", "Bearer " + appToken)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(list.statusCode(), is(200));
        assertThat(JsonPath.read(list.body(), "$[0].clientId"), is(CLIENT_ID));
        assertThat(JsonPath.read(list.body(), "$[0].name"), is("Personal OS"));
        assertThat(
                (List<String>) JsonPath.read(list.body(), "$[0].scopes"),
                containsInAnyOrder("recipes.read", "shoppinglist.write"));

        // Another user sees nothing of alice's connections.
        User bob = verifiedUser("bob@mealflow.dev");
        HttpResponse<String> bobList = api.send(
                HttpRequest.newBuilder(uri("/account/connections"))
                        .header("Authorization", "Bearer " + accessTokenService.issue(bob.getId()))
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(bobList.body(), is("[]"));

        HttpResponse<String> revoke = api.send(
                HttpRequest.newBuilder(uri("/account/connections/" + CLIENT_ID))
                        .header("Authorization", "Bearer " + appToken)
                        .DELETE()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(revoke.statusCode(), is(204));
        assertThat(refresh(t.refresh).statusCode(), is(400));
        assertThat(grantDoc((String) claims(t.access).get("gid")), nullValue());
        assertThat(
                audit.findAll().stream().map(AuditEvent::getEventType).toList(),
                hasItem(AuditEventType.OAUTH_ACCESS_REVOKED_BY_USER));
    }

    @Test
    void connectionsApi_rejectsIntegrationTokens() throws Exception {
        Tokens t = connect(alice, "recipes.read", Pkce.create());
        HttpResponse<String> list = api.send(
                HttpRequest.newBuilder(uri("/account/connections"))
                        .header("Authorization", "Bearer " + t.access)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(list.statusCode(), is(401));
    }

    // ================================================================ helpers

    private Tokens connect(User user, String scopes, Pkce pkce) throws Exception {
        String code = authorize(loggedInBrowser(user), scopes, pkce);
        return exchange(code, pkce);
    }

    private String authorize(Browser b, String scopes, Pkce pkce) throws Exception {
        HttpResponse<String> toConsent = b.get(authorizeUrl(scopes, pkce.challenge, "S256", REDIRECT));
        assertThat(toConsent.statusCode(), is(302));
        assertThat(location(toConsent), containsString("/oauth2/consent"));
        return approve(b, absolute(location(toConsent)), List.of(scopes.split(" ")));
    }

    private String approve(Browser b, String consentUrl, List<String> scopes) throws Exception {
        HttpResponse<String> page = b.get(consentUrl);
        assertThat(page.statusCode(), is(200));
        String state = hidden(page.body(), "state");
        StringBuilder body = new StringBuilder(form(Map.of("client_id", CLIENT_ID, "state", state)));
        for (String s : scopes) {
            body.append("&scope=").append(URLEncoder.encode(s, StandardCharsets.UTF_8));
        }
        HttpResponse<String> res = b.postRaw("/oauth2/authorize", body.toString());
        assertThat(res.statusCode(), is(302));
        String loc = location(res);
        assertThat(loc, startsWith(REDIRECT));
        assertThat(query(loc).get("state"), is("client-state-123"));
        return query(loc).get("code");
    }

    private Tokens exchange(String code, Pkce pkce) throws Exception {
        HttpResponse<String> res = token(Map.of(
                "grant_type",
                "authorization_code",
                "code",
                code,
                "redirect_uri",
                REDIRECT,
                "code_verifier",
                pkce.verifier));
        assertThat(res.body(), res.statusCode(), is(200));
        return new Tokens(
                JsonPath.read(res.body(), "$.access_token"),
                JsonPath.read(res.body(), "$.refresh_token"),
                JsonPath.read(res.body(), "$.scope"));
    }

    private HttpResponse<String> refresh(String refreshToken) throws Exception {
        return token(Map.of("grant_type", "refresh_token", "refresh_token", refreshToken));
    }

    private HttpResponse<String> token(Map<String, String> params) throws Exception {
        return api.send(
                HttpRequest.newBuilder(uri("/oauth2/token"))
                        .header("Authorization", basicAuth())
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form(params)))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private Browser loggedInBrowser(User user) throws Exception {
        Browser b = new Browser();
        HttpResponse<String> res = b.login(user.getEmail(), PASSWORD);
        assertThat(res.statusCode(), is(302));
        assertThat(location(res), not(containsString("error")));
        return b;
    }

    private void assertRefusedWithError(HttpResponse<String> res, String error) {
        String loc = res.headers().firstValue("Location").orElse("");
        boolean redirectedWithError =
                res.statusCode() == 302 && loc.startsWith(REDIRECT) && loc.contains("error=" + error);
        boolean badRequest = res.statusCode() == 400;
        assertThat("status=" + res.statusCode() + " location=" + loc, redirectedWithError || badRequest, is(true));
        assertThat(loc, not(containsString("code=")));
    }

    private String authorizeUrl(String scopes, String challenge, String method, String redirect) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("response_type", "code");
        p.put("client_id", CLIENT_ID);
        p.put("redirect_uri", redirect);
        p.put("scope", scopes);
        p.put("state", "client-state-123");
        if (challenge != null) p.put("code_challenge", challenge);
        if (method != null) p.put("code_challenge_method", method);
        return absolute("/oauth2/authorize?" + form(p));
    }

    private User verifiedUser(String email) {
        Instant now = Instant.now();
        return users.save(new User(email, passwordService.hash(PASSWORD), true, now, now, now));
    }

    private Document grantDoc(String gid) {
        return mongo.getCollection("oauth2_authorizations")
                .find(new Document("_id", gid))
                .first();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> claims(String jwt) {
        String payload = new String(Base64.getUrlDecoder().decode(jwt.split("\\.")[1]), StandardCharsets.UTF_8);
        return JsonPath.read(payload, "$");
    }

    private static String hidden(String html, String name) {
        Matcher m =
                Pattern.compile("name=\"" + name + "\"\\s+value=\"([^\"]*)\"").matcher(html);
        if (!m.find()) {
            m = Pattern.compile("value=\"([^\"]*)\"\\s+name=\"" + name + "\"").matcher(html);
            if (!m.find()) throw new AssertionError("hidden input " + name + " not found in:\n" + html);
        }
        return m.group(1).replace("&#45;", "-").replace("&#x2d;", "-");
    }

    private static Map<String, String> query(String url) {
        String q = URI.create(url).getRawQuery();
        Map<String, String> out = new LinkedHashMap<>();
        for (String kv : q.split("&")) {
            String[] p = kv.split("=", 2);
            out.put(p[0], p.length > 1 ? URLDecoder.decode(p[1], StandardCharsets.UTF_8) : "");
        }
        return out;
    }

    private static String form(Map<String, String> params) {
        return params.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
    }

    private static String basicAuth() {
        return "Basic "
                + Base64.getEncoder()
                        .encodeToString((CLIENT_ID + ":" + CLIENT_SECRET).getBytes(StandardCharsets.UTF_8));
    }

    private static String location(HttpResponse<?> res) {
        return res.headers()
                .firstValue("Location")
                .orElseThrow(
                        () -> new AssertionError("no Location, status " + res.statusCode() + " body " + res.body()));
    }

    private URI uri(String path) {
        return URI.create(absolute(path));
    }

    private String absolute(String pathOrUrl) {
        return pathOrUrl.startsWith("http") ? pathOrUrl : "http://localhost:" + port + pathOrUrl;
    }

    record Tokens(String access, String refresh, String scope) {}

    record Pkce(String verifier, String challenge) {
        static Pkce create() throws Exception {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return new Pkce(verifier, Base64.getUrlEncoder().withoutPadding().encodeToString(digest));
        }
    }

    /** A cookie-keeping browser that does not follow redirects. */
    class Browser {
        final HttpClient http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        String csrf;

        HttpResponse<String> get(String url) throws Exception {
            return get(url, "en");
        }

        HttpResponse<String> get(String url, String acceptLanguage) throws Exception {
            HttpResponse<String> res = http.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .header("Accept", "text/html")
                            .header("Accept-Language", acceptLanguage)
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            Matcher m = Pattern.compile("name=\"_csrf\"\\s+value=\"([^\"]+)\"").matcher(res.body());
            if (m.find()) csrf = m.group(1);
            return res;
        }

        HttpResponse<String> login(String email, String password) throws Exception {
            get(absolute("/oauth/login"));
            return postForm("/oauth/login", Map.of("email", email, "password", password));
        }

        HttpResponse<String> postForm(String path, Map<String, String> params) throws Exception {
            return postRaw(path, form(params));
        }

        HttpResponse<String> postRaw(String path, String body) throws Exception {
            String withCsrf = csrf == null ? body : body + "&_csrf=" + URLEncoder.encode(csrf, StandardCharsets.UTF_8);
            return http.send(
                    HttpRequest.newBuilder(uri(path))
                            .header("Accept", "text/html")
                            .header("Content-Type", "application/x-www-form-urlencoded")
                            .POST(HttpRequest.BodyPublishers.ofString(withCsrf))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
        }
    }
}
