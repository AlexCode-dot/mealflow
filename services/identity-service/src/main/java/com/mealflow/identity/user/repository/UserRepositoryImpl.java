package com.mealflow.identity.user.repository;

import com.mealflow.identity.user.domain.User;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

/**
 * Admin-side queries for users. Kept separate from {@link UserRepository}
 * because spring-data derived methods would either be unwieldy (multi-filter
 * search) or wouldn't express the cursor pagination we want.
 *
 * <p>All queries here are best-effort and read-only — write paths still go
 * through the standard {@code save()} on {@code UserRepository}.
 */
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final MongoTemplate mongo;

    public UserRepositoryImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public List<User> findAdminUsersPage(String search, String status, String cursor, int limit) {
        Criteria criteria = new Criteria().andOperator(deletedFilter(), statusFilter(status));

        if (search != null && !search.isBlank()) {
            // Case-insensitive substring match. Quote to avoid the operator
            // accidentally interpreting metacharacters from the operator's input.
            String escaped = Pattern.quote(search.trim());
            criteria =
                    new Criteria().andOperator(criteria, Criteria.where("email").regex(escaped, "i"));
        }

        Cursor decoded = Cursor.decode(cursor);
        if (decoded != null) {
            // Compound cursor on (createdAt desc, id desc): the next page begins
            // strictly before the cursor instant, or — for ties — at a strictly
            // smaller id within the same instant.
            Criteria tieBreaker = new Criteria()
                    .orOperator(
                            Criteria.where("createdAt").lt(decoded.createdAt),
                            new Criteria()
                                    .andOperator(
                                            Criteria.where("createdAt").is(decoded.createdAt),
                                            Criteria.where("_id").lt(decoded.id)));
            criteria = new Criteria().andOperator(criteria, tieBreaker);
        }

        Query query = new Query(criteria)
                .with(Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "_id")))
                .limit(limit + 1);
        return mongo.find(query, User.class);
    }

    @Override
    public Optional<User> findActiveById(String id) {
        // Use findById (not a hand-built Criteria) so the standard
        // MappingMongoConverter handles the String ↔ ObjectId case. Spring
        // Data stores @Id Strings as ObjectId when they happen to look like
        // hex — a raw {"_id": "<hex>"} criteria would silently fail to match
        // because the BSON type differs. We hit this bug live: user.detail
        // returned 404 on real users while user.list worked fine.
        User user = mongo.findById(id, User.class);
        if (user == null || user.isDeleted()) return Optional.empty();
        return Optional.of(user);
    }

    private static Criteria deletedFilter() {
        // Soft-deleted rows are excluded from every admin listing.
        return Criteria.where("deletedAt").is(null);
    }

    private static Criteria statusFilter(String status) {
        if (status == null) return new Criteria(); // any
        return switch (status) {
            case "disabled" -> Criteria.where("disabledAt").ne(null);
            case "active" -> Criteria.where("disabledAt").is(null);
            // "invited" is not a state mealflow currently models — admins only see
            // self-registered users, so we return an always-false filter rather
            // than silently widening the result set.
            case "invited" -> Criteria.where("_id").is("__never__");
            default -> new Criteria();
        };
    }

    /**
     * Opaque cursor format: base64url("<epoch-millis>:<id>"). Plain so any client
     * could decode it, but we don't promise stability — treat as opaque.
     */
    private record Cursor(Instant createdAt, String id) {
        static Cursor decode(String raw) {
            if (raw == null || raw.isBlank()) return null;
            try {
                String decoded = new String(Base64.getUrlDecoder().decode(raw));
                int sep = decoded.indexOf(':');
                if (sep < 0) return null;
                long millis = Long.parseLong(decoded.substring(0, sep));
                String id = decoded.substring(sep + 1);
                return new Cursor(Instant.ofEpochMilli(millis), id);
            } catch (RuntimeException e) {
                // Bad cursor → start from the top. Failing the request would be
                // worse UX and there's no security cost.
                return null;
            }
        }

        public static String encode(Instant createdAt, String id) {
            String raw = createdAt.toEpochMilli() + ":" + id;
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes());
        }
    }

    /** Exposed so the controller layer can build the next-page cursor without re-implementing it. */
    public static String encodeCursor(Instant createdAt, String id) {
        return Cursor.encode(createdAt, id);
    }
}
