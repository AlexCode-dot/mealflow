package com.mealflow.appapi.security.oauth;

import java.util.stream.Collectors;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidationException;

/**
 * Decodes with a shared base decoder (signature via the identity-service JWKS, plus its own
 * validators) and then applies an extra validator chain. Lets the first-party {@code /api/**} chain
 * and the {@code /integrations/**} chain share one JWKS cache while enforcing different token
 * rules. A failed validation throws {@link JwtValidationException}, which the resource server turns
 * into a 401.
 */
public class ValidatingJwtDecoder implements JwtDecoder {

    private final JwtDecoder delegate;
    private final OAuth2TokenValidator<Jwt> validator;

    public ValidatingJwtDecoder(JwtDecoder delegate, OAuth2TokenValidator<Jwt> validator) {
        this.delegate = delegate;
        this.validator = validator;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        Jwt jwt = delegate.decode(token);
        OAuth2TokenValidatorResult result = validator.validate(jwt);
        if (result.hasErrors()) {
            String description =
                    result.getErrors().stream().map(OAuth2Error::getDescription).collect(Collectors.joining("; "));
            throw new JwtValidationException(description, result.getErrors());
        }
        return jwt;
    }
}
