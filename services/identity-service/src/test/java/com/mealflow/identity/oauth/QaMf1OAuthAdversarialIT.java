package com.mealflow.identity.oauth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.identity.audit.domain.AuditEvent;
import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.repository.AuditEventRepository;
import com.mealflow.identity.auth.PasswordService;
import com.mealflow.identity.oauth.store.OAuthAuthorizationDocument;
import com.mealflow.identity.oauth.store.OAuthConsentDocument;
import com.mealflow.identity.security.jwt.AccessTokenService;
import com.mealflow.identity.support.MongoTestContainerConfig;
import com.mealflow.identity.support.TestRsaKeysConfig;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * Independent QA (MF1, 2026-10-11): adversarial checks on the OAuth authorization server that the
 * author's {@code OAuthProviderIT} does not already pin down — redirect URI look-alikes, scope
 * escalation at authorize / consent / refresh, forged and cross-session consent submissions,
 * login CSRF + session fixation, the OAuth session never authenticating the first-party API,
 * disabled / unverified accounts, token lifetimes and claims, and account deletion.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
class QaMf1OAuthAdversarialIT extends MongoTestContainerConfig {

    static final String CLIENT_ID = "personal-os";
    static final String CLIENT_SECRET = "test-only-client-secret";
    static final String REDIRECT = "http://127.0.0.1:9999/callback";
    static final String PASSWORD = "VeryStrongPass123!";

    @LocalServerPort
    int port;

    @Value("${jwt.issuer}")
    String issuer;

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

    final HttpClient api =
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

    User alice;
    User bob;

    @BeforeEach
    void setUp() {
        alice = verifiedUser("qa-alice@mealflow.dev");
        bob = verifiedUser("qa-bob@mealflow.dev");
    }

    @AfterEach
    void cleanup() {
        mongo.dropCollection(OAuthAuthorizationDocument.class);
        mongo.dropCollection(OAuthConsentDocument.class);
        audit.deleteAll();
        users.deleteAll();
        mongo.dropCollection("email_verifications");
    }

    // ---------------------------------------------------------------- N1: redirect URI

    @Test
    void redirectUriLookAlikes_areRefused_withoutRedirectingThere() throws Exception {
        Browser b = loggedInBrowser(alice);
        List<String> lookAlikes = List.of(
                "http://127.0.0.1:9999/callback/",
                "http://127.0.0.1:9999/callbackx",
                "http://127.0.0.1:9999/callback/../evil",
                "http://127.0.0.1:9999/callback?next=https://evil.example",
                "http://127.0.0.1:9999/callback#frag",
                "https://127.0.0.1:9999/callback",
                "http://localhost:9999/callback",
                "http://127.0.0.1.evil.example:9999/callback",
                "http://127.0.0.1:9999@evil.example/callback");
        for (String uri : lookAlikes) {
            HttpResponse<String> res = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", uri));
            String loc = res.headers().firstValue("Location").orElse("");
            assertThat(uri + " -> " + res.statusCode() + " " + loc, loc, not(containsString("code=")));
            assertThat(uri + " -> " + res.statusCode() + " " + loc, loc.startsWith(uri), is(false));
        }
    }

    @Test
    void tokenExchange_withADifferentRedirectUri_orWithoutIt_isRefused() throws Exception {
        Pkce pkce = Pkce.create();
        String code = authorize(loggedInBrowser(alice), "recipes.read", pkce);
        HttpResponse<String> other = token(Map.of(
                "grant_type",
                "authorization_code",
                "code",
                code,
                "redirect_uri",
                "http://127.0.0.1:9999/other",
                "code_verifier",
                pkce.verifier));
        assertThat(other.body(), other.statusCode(), is(400));

        Pkce pkce2 = Pkce.create();
        String code2 = authorize(loggedInBrowser(alice), "recipes.read", pkce2);
        HttpResponse<String> missing =
                token(Map.of("grant_type", "authorization_code", "code", code2, "code_verifier", pkce2.verifier));
        assertThat(missing.body(), missing.statusCode(), is(400));
    }

    // ---------------------------------------------------------------- N1: client authentication

    @Test
    void tokenEndpoint_refusesWrongSecret_andPublicClientUse() throws Exception {
        Pkce pkce = Pkce.create();
        String code = authorize(loggedInBrowser(alice), "recipes.read", pkce);
        Map<String, String> params = Map.of(
                "grant_type",
                "authorization_code",
                "code",
                code,
                "redirect_uri",
                REDIRECT,
                "code_verifier",
                pkce.verifier);

        HttpResponse<String> wrongSecret = postForm("/oauth2/token", params, basicAuth(CLIENT_ID, "nope"));
        assertThat(wrongSecret.statusCode(), is(401));

        Map<String, String> publicClient = new LinkedHashMap<>(params);
        publicClient.put("client_id", CLIENT_ID);
        HttpResponse<String> noSecret = postForm("/oauth2/token", publicClient, null);
        assertThat(noSecret.statusCode(), is(401));

        // The code was not burned by the failed attempts — the real client can still redeem it.
        assertThat(
                postForm("/oauth2/token", params, basicAuth(CLIENT_ID, CLIENT_SECRET))
                        .statusCode(),
                is(200));
    }

    @Test
    void implicitAndOtherResponseTypes_areRefused() throws Exception {
        Browser b = loggedInBrowser(alice);
        String url = authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT)
                .replace("response_type=code", "response_type=token");
        HttpResponse<String> res = b.get(url);
        String loc = res.headers().firstValue("Location").orElse("");
        assertThat(loc, not(containsString("access_token")));
        assertThat(loc, not(containsString("code=")));
        assertThat(res.statusCode(), anyOf(is(400), is(302)));
    }

    // ---------------------------------------------------------------- N1: scope escalation

    @Test
    void unknownScope_atAuthorize_isRefused() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> res = b.get(authorizeUrl("recipes.read admin", Pkce.create().challenge, "S256", REDIRECT));
        String loc = res.headers().firstValue("Location").orElse("");
        assertThat(loc, not(containsString("/oauth2/consent")));
        assertThat(loc, not(containsString("code=")));
    }

    @Test
    void consentSubmission_cannotAddScopesThatWereNotRequested() throws Exception {
        Browser b = loggedInBrowser(alice);
        Pkce pkce = Pkce.create();
        HttpResponse<String> toConsent = b.get(authorizeUrl("recipes.read", pkce.challenge, "S256", REDIRECT));
        String state = hidden(b.get(absolute(location(toConsent))).body(), "state");
        String body = form(Map.of("client_id", CLIENT_ID, "state", state))
                + "&scope=recipes.read&scope=recipes.write&scope=shoppinglist.write";
        HttpResponse<String> res = b.postRaw("/oauth2/authorize", body);
        String loc = res.headers().firstValue("Location").orElse("");
        if (loc.contains("code=")) {
            Tokens t = exchange(query(loc).get("code"), pkce);
            assertThat(t.scope, is("recipes.read"));
            assertThat(scopes(t.access), contains("recipes.read"));
        }
    }

    @Test
    void partialConsent_issuesOnlyTheApprovedScopes() throws Exception {
        Browser b = loggedInBrowser(alice);
        Pkce pkce = Pkce.create();
        HttpResponse<String> toConsent =
                b.get(authorizeUrl("recipes.read recipes.write", pkce.challenge, "S256", REDIRECT));
        String code = approve(b, absolute(location(toConsent)), List.of("recipes.read"));
        Tokens t = exchange(code, pkce);
        assertThat(scopes(t.access), contains("recipes.read"));
    }

    @Test
    void refresh_cannotWidenScope() throws Exception {
        Tokens t = connect(alice, "recipes.read");
        HttpResponse<String> wider = token(Map.of(
                "grant_type", "refresh_token", "refresh_token", t.refresh, "scope", "recipes.read recipes.write"));
        assertThat(wider.body(), wider.statusCode(), is(400));
        assertThat(JsonPath.read(wider.body(), "$.error"), is("invalid_scope"));
    }

    // ---------------------------------------------------------------- N1/N2: consent forgery (CSRF)

    @Test
    void consentPost_withForgedState_issuesNoCode() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> toConsent = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        b.get(absolute(location(toConsent)));
        HttpResponse<String> res = b.postRaw(
                "/oauth2/authorize",
                form(Map.of("client_id", CLIENT_ID, "state", "forged-state", "scope", "recipes.read")));
        assertThat(res.headers().firstValue("Location").orElse(""), not(containsString("code=")));
    }

    @Test
    void consentStateOfAlice_cannotBeRedeemedInBobsSession() throws Exception {
        Browser aliceBrowser = loggedInBrowser(alice);
        HttpResponse<String> toConsent =
                aliceBrowser.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        String aliceState =
                hidden(aliceBrowser.get(absolute(location(toConsent))).body(), "state");

        Browser bobBrowser = loggedInBrowser(bob);
        bobBrowser.get(absolute("/oauth/login")); // fresh CSRF token for Bob's session
        HttpResponse<String> res = bobBrowser.postRaw(
                "/oauth2/authorize",
                form(Map.of("client_id", CLIENT_ID, "state", aliceState, "scope", "recipes.read")));
        assertThat(res.headers().firstValue("Location").orElse(""), not(containsString("code=")));
        assertThat(
                mongo.findAll(OAuthAuthorizationDocument.class).stream()
                        .filter(d -> d.accessTokenHash != null)
                        .count(),
                is(0L));
    }

    @Test
    void consentPost_fromAnotherOrigin_withoutSession_issuesNoCode() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> toConsent = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        String state = hidden(b.get(absolute(location(toConsent))).body(), "state");
        // An attacker who learned the consent state but has no victim session cookie.
        HttpResponse<String> res = postForm(
                "/oauth2/authorize", Map.of("client_id", CLIENT_ID, "state", state, "scope", "recipes.read"), null);
        assertThat(res.headers().firstValue("Location").orElse(""), not(containsString("code=")));
    }

    // ---------------------------------------------------------------- N2: login protections

    @Test
    void oauthLogin_withoutCsrfToken_isRejected_andDoesNotAuthenticate() throws Exception {
        Browser b = new Browser();
        b.get(absolute("/oauth/login"));
        b.csrf = null;
        HttpResponse<String> res = b.postForm("/oauth/login", Map.of("email", alice.getEmail(), "password", PASSWORD));
        assertThat(res.statusCode(), is(403));
        HttpResponse<String> authorize = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        assertThat(location(authorize), containsString("/oauth/login"));
    }

    @Test
    void oauthLogin_rotatesTheSessionId() throws Exception {
        Browser b = new Browser();
        b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        b.get(absolute("/oauth/login"));
        String before = b.sessionId();
        assertThat(before, notNullValue());
        HttpResponse<String> res = b.postForm("/oauth/login", Map.of("email", alice.getEmail(), "password", PASSWORD));
        assertThat(res.statusCode(), is(302));
        assertThat(b.sessionId(), not(is(before)));
    }

    @Test
    void oauthBrowserSession_neverAuthenticatesTheFirstPartyApi() throws Exception {
        Browser b = loggedInBrowser(alice);
        HttpResponse<String> me = b.http.send(
                HttpRequest.newBuilder(uri("/auth/me")).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(me.statusCode(), is(401));
        HttpResponse<String> connections = b.http.send(
                HttpRequest.newBuilder(uri("/account/connections")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(connections.statusCode(), is(401));
        HttpResponse<String> delete = b.http.send(
                HttpRequest.newBuilder(uri("/account")).DELETE().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(delete.statusCode(), anyOf(is(401), is(403)));
        assertThat(users.findById(alice.getId()).isPresent(), is(true));
    }

    @Test
    void disabledOrDeletedAccount_cannotLogInThroughOAuth() throws Exception {
        mongo.getCollection("users")
                .updateOne(
                        new Document("_id", new org.bson.types.ObjectId(alice.getId())),
                        new Document("$set", new Document("disabledAt", new java.util.Date())));
        mongo.getCollection("users")
                .updateOne(
                        new Document("_id", new org.bson.types.ObjectId(bob.getId())),
                        new Document("$set", new Document("deletedAt", new java.util.Date())));
        for (User u : List.of(alice, bob)) {
            Browser b = new Browser();
            HttpResponse<String> res = b.login(u.getEmail(), PASSWORD);
            assertThat(u.getEmail(), location(res), containsString("/oauth/login?error"));
        }
    }

    @Test
    void unverifiedAccount_isSentToEmailCode_andGetsNoConsentOrCode() throws Exception {
        Instant now = Instant.now();
        User carol = users.save(new User("qa-carol@mealflow.dev", passwordService.hash(PASSWORD), now, now));
        Browser b = new Browser();
        b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        HttpResponse<String> res = b.login(carol.getEmail(), PASSWORD);
        assertThat(location(res), containsString("/oauth/verify"));
        HttpResponse<String> again = b.get(authorizeUrl("recipes.read", Pkce.create().challenge, "S256", REDIRECT));
        assertThat(location(again), containsString("/oauth/login"));
    }

    // ---------------------------------------------------------------- N1: tokens

    @Test
    void accessToken_hasShortLifetime_correctIssuerAudienceSubject_andCodeIsShortLived() throws Exception {
        Tokens t = connect(alice, "recipes.read mealplan.read");
        Map<String, Object> c = claims(t.access);
        long iat = ((Number) c.get("iat")).longValue();
        long exp = ((Number) c.get("exp")).longValue();
        assertThat(exp - iat, lessThanOrEqualTo(300L));
        assertThat(c.get("iss"), is(issuer));
        Object aud = c.get("aud");
        assertThat(aud instanceof List ? (List<?>) aud : List.of(aud), contains("mealflow-integrations"));
        assertThat(c.get("sub"), is(alice.getId()));
        assertThat(c.get("client_id"), is(CLIENT_ID));
        assertThat(c, not(hasKey("email")));

        Document grant = mongo.getCollection("oauth2_authorizations")
                .find(new Document("_id", c.get("gid")))
                .first();
        Document code = (Document) grant.get("authorizationCode");
        long codeTtl =
                code.getDate("expiresAt").getTime() - code.getDate("issuedAt").getTime();
        assertThat(codeTtl, lessThanOrEqualTo(5 * 60 * 1000L));
        assertThat(code.getBoolean("invalidated"), is(true));
        Document refresh = (Document) grant.get("refreshToken");
        long refreshTtlDays = (refresh.getDate("expiresAt").getTime()
                        - refresh.getDate("issuedAt").getTime())
                / 86_400_000L;
        assertThat(refreshTtlDays, lessThanOrEqualTo(30L));
        assertThat(grant.toJson(), not(containsString(t.access)));
        assertThat(grant.toJson(), not(containsString(t.refresh)));
    }

    @Test
    void reuseDetection_auditCarriesNoTokenValues_andRevokingAccessTokenRevokesGrant() throws Exception {
        Tokens t = connect(alice, "recipes.read");
        HttpResponse<String> rotated = token(Map.of("grant_type", "refresh_token", "refresh_token", t.refresh));
        assertThat(rotated.statusCode(), is(200));
        String newRefresh = JsonPath.read(rotated.body(), "$.refresh_token");
        String newAccess = JsonPath.read(rotated.body(), "$.access_token");
        assertThat(
                token(Map.of("grant_type", "refresh_token", "refresh_token", t.refresh))
                        .statusCode(),
                is(400));
        assertThat(
                token(Map.of("grant_type", "refresh_token", "refresh_token", newRefresh))
                        .statusCode(),
                is(400));

        List<AuditEvent> events = audit.findAll();
        assertThat(
                events.stream().map(AuditEvent::getEventType).toList(), hasItem(AuditEventType.TOKEN_REUSE_DETECTED));
        String all = mongo.getCollection("audit_events")
                        .find()
                        .into(new java.util.ArrayList<>())
                        .toString()
                + events;
        for (String secret : List.of(t.access, t.refresh, newAccess, newRefresh)) {
            assertThat(all, not(containsString(secret)));
        }

        Tokens t2 = connect(alice, "recipes.read");
        HttpResponse<String> revoke = postForm(
                "/oauth2/revoke",
                Map.of("token", t2.access, "token_type_hint", "access_token"),
                basicAuth(CLIENT_ID, CLIENT_SECRET));
        assertThat(revoke.statusCode(), is(200));
        Document grant = mongo.getCollection("oauth2_authorizations")
                .find(new Document("_id", claims(t2.access).get("gid")))
                .first();
        assertThat(grant.getBoolean("revoked"), is(true));
    }

    // ---------------------------------------------------------------- N5: user control

    @Test
    void disconnect_isPerUser_andAccountDeletionRemovesGrants() throws Exception {
        Tokens aliceTokens = connect(alice, "recipes.read");
        Tokens bobTokens = connect(bob, "recipes.read");

        // Alice disconnecting removes only her grant.
        HttpResponse<String> del = bearer("DELETE", "/account/connections/" + CLIENT_ID, alice);
        assertThat(del.statusCode(), is(204));
        assertThat(grantOf(aliceTokens), nullValue());
        assertThat(grantOf(bobTokens), notNullValue());
        assertThat(refresh(aliceTokens.refresh).statusCode(), is(400));
        assertThat(refresh(bobTokens.refresh).statusCode(), is(200));
        assertThat(bearer("DELETE", "/account/connections/not-a-client", alice).statusCode(), is(404));

        // Bob deletes his account: his grants and consents go with it.
        Tokens bobAgain = connect(bob, "recipes.read");
        assertThat(bearer("DELETE", "/account", bob).statusCode(), anyOf(is(200), is(204)));
        assertThat(grantOf(bobAgain), nullValue());
        assertThat(
                mongo.getCollection("oauth2_authorizations").countDocuments(new Document("principalName", bob.getId())),
                is(0L));
    }

    // ---------------------------------------------------------------- helpers

    private Document grantOf(Tokens t) {
        return mongo.getCollection("oauth2_authorizations")
                .find(new Document("_id", claims(t.access).get("gid")))
                .first();
    }

    private HttpResponse<String> bearer(String method, String path, User user) throws Exception {
        return api.send(
                HttpRequest.newBuilder(uri(path))
                        .header("Authorization", "Bearer " + accessTokenService.issue(user.getId()))
                        .method(method, HttpRequest.BodyPublishers.noBody())
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private Tokens connect(User user, String scopes) throws Exception {
        Pkce pkce = Pkce.create();
        return exchange(authorize(loggedInBrowser(user), scopes, pkce), pkce);
    }

    private String authorize(Browser b, String scopes, Pkce pkce) throws Exception {
        HttpResponse<String> toConsent = b.get(authorizeUrl(scopes, pkce.challenge, "S256", REDIRECT));
        assertThat(toConsent.statusCode(), is(302));
        if (location(toConsent).startsWith(REDIRECT)) {
            // Scopes already consented earlier by this user: the library issues the code directly.
            return query(location(toConsent)).get("code");
        }
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
        assertThat(query(loc).get("state"), is("qa-state"));
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
        return postForm("/oauth2/token", params, basicAuth(CLIENT_ID, CLIENT_SECRET));
    }

    private HttpResponse<String> postForm(String path, Map<String, String> params, String authorization)
            throws Exception {
        HttpRequest.Builder req = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form(params)));
        if (authorization != null) {
            req.header("Authorization", authorization);
        }
        return api.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    private Browser loggedInBrowser(User user) throws Exception {
        Browser b = new Browser();
        HttpResponse<String> res = b.login(user.getEmail(), PASSWORD);
        assertThat(res.statusCode(), is(302));
        assertThat(location(res), not(containsString("error")));
        return b;
    }

    private String authorizeUrl(String scopes, String challenge, String method, String redirect) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("response_type", "code");
        p.put("client_id", CLIENT_ID);
        p.put("redirect_uri", redirect);
        p.put("scope", scopes);
        p.put("state", "qa-state");
        if (challenge != null) p.put("code_challenge", challenge);
        if (method != null) p.put("code_challenge_method", method);
        return absolute("/oauth2/authorize?" + form(p));
    }

    private User verifiedUser(String email) {
        Instant now = Instant.now();
        return users.save(new User(email, passwordService.hash(PASSWORD), true, now, now, now));
    }

    @SuppressWarnings("unchecked")
    private static List<String> scopes(String jwt) {
        Object scope = claims(jwt).get("scope");
        return scope instanceof List<?> l
                ? (List<String>) l
                : List.of(String.valueOf(scope).split(" "));
    }

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

    private static String basicAuth(String id, String secret) {
        return "Basic " + Base64.getEncoder().encodeToString((id + ":" + secret).getBytes(StandardCharsets.UTF_8));
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
        final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        final HttpClient http = HttpClient.newBuilder()
                .cookieHandler(cookies)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        String csrf;

        String sessionId() {
            return cookies.getCookieStore().getCookies().stream()
                    .filter(c -> c.getName().equals("JSESSIONID"))
                    .map(HttpCookie::getValue)
                    .findFirst()
                    .orElse(null);
        }

        HttpResponse<String> get(String url) throws Exception {
            HttpResponse<String> res = http.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .header("Accept", "text/html")
                            .header("Accept-Language", "en")
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
