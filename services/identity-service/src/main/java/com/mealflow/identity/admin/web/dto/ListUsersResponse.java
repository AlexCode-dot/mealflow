package com.mealflow.identity.admin.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Matches the {@code ListUsersResponse} zod schema. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ListUsersResponse(List<AdminUserDto> users, String nextCursor, Long total) {}
