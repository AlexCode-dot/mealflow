package com.mealflow.identity.oauth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.mealflow.identity.oauth.config.OAuthScopes;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;

/** Every user-facing OAuth string exists in English and Swedish, incl. one label per scope. */
class OAuthMessagesTest {

    @Test
    void englishAndSwedishHaveTheSameKeys_andEveryScopeIsNamed() throws Exception {
        Properties en = load("/messages.properties");
        Properties sv = load("/messages_sv.properties");

        assertThat(en.stringPropertyNames(), not(empty()));
        assertThat(sv.stringPropertyNames(), equalTo(en.stringPropertyNames()));
        for (String scope : OAuthScopes.ALL) {
            assertThat(en.getProperty("oauth.scope." + scope), not(blankOrNullString()));
            assertThat(sv.getProperty("oauth.scope." + scope), not(blankOrNullString()));
            assertThat(sv.getProperty("oauth.scope." + scope), not(equalTo(en.getProperty("oauth.scope." + scope))));
        }
        for (String key : en.stringPropertyNames()) {
            assertThat(key, sv.getProperty(key), not(blankOrNullString()));
        }
    }

    private static Properties load(String path) throws Exception {
        Properties p = new Properties();
        try (InputStream in = OAuthMessagesTest.class.getResourceAsStream(path)) {
            assertThat(path, in, notNullValue());
            p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return p;
    }
}
