package com.mealflow.identity.account.web;

import com.mealflow.identity.account.service.AccountService;
import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/account")
public class AccountController {

    private final AccountService accountService;
    private final AuditService auditService;

    public AccountController(AccountService accountService, AuditService auditService) {
        this.accountService = accountService;
        this.auditService = auditService;
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal Jwt jwt, HttpServletRequest request) {
        String userId = jwt.getSubject();
        accountService.deleteAccount(userId);
        // Emit AFTER delete so the audit row reflects "the account is gone".
        // actorUserId is still the now-deleted user — that's intentional, the
        // monitoring page wants to know who initiated the deletion.
        auditService.log(
                AuditEventType.ACCOUNT_DELETED,
                AuditEventType.OUTCOME_SUCCESS,
                userId,
                "user",
                userId,
                request,
                Map.of("initiator", "self"));
    }
}
