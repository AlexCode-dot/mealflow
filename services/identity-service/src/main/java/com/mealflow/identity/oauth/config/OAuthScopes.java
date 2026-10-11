package com.mealflow.identity.oauth.config;

import java.util.List;

/** Scopes a connected app (Personal OS) can be granted. Order = order on the consent screen. */
public final class OAuthScopes {

    private OAuthScopes() {}

    public static final String RECIPES_READ = "recipes.read";
    public static final String RECIPES_WRITE = "recipes.write";
    public static final String MEALPLAN_READ = "mealplan.read";
    public static final String MEALPLAN_WRITE = "mealplan.write";
    public static final String SHOPPINGLIST_READ = "shoppinglist.read";
    public static final String SHOPPINGLIST_WRITE = "shoppinglist.write";

    public static final List<String> ALL =
            List.of(RECIPES_READ, RECIPES_WRITE, MEALPLAN_READ, MEALPLAN_WRITE, SHOPPINGLIST_READ, SHOPPINGLIST_WRITE);

    /** Audience of access tokens issued to connected apps; app-api's /integrations chain requires it. */
    public static final String INTEGRATIONS_AUDIENCE = "mealflow-integrations";

    /** Stable internal id of the Personal OS registered client (persisted on grants). */
    public static final String PERSONAL_OS_REGISTERED_ID = "personal-os";
}
