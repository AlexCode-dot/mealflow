package com.mealflow.identity.oauth.store;

import java.time.Instant;
import java.util.Set;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** Scopes a user has approved for a connected app. {@code _id} = registeredClientId + ":" + userId. */
@Document(collection = "oauth2_authorization_consents")
public class OAuthConsentDocument {

    @Id
    public String id;

    public String registeredClientId;

    @Indexed
    public String principalName;

    public Set<String> authorities;
    public Instant updatedAt;

    public static String idOf(String registeredClientId, String principalName) {
        return registeredClientId + ":" + principalName;
    }
}
