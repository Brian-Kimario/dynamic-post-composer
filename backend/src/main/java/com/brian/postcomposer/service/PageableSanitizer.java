package com.brian.postcomposer.service;

import com.brian.postcomposer.exception.InvalidRequestException;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Sorting comes straight from the query string ({@code ?sort=updatedAt,desc}), so it is an input like any other:
 * only whitelisted public names are accepted and each is mapped to a real entity property. Anything else is a 400
 * instead of a 500 from the persistence layer, and an unknown name never reaches a query. A unique tie-breaker
 * ({@code id}) is appended so pages are stable even when many rows share the sorted value.
 */
final class PageableSanitizer {
    private PageableSanitizer() {}

    static Pageable sanitize(Pageable pageable, Map<String, String> sortableFields) {
        List<Sort.Order> orders = pageable.getSort().stream().map(order -> {
            String property = sortableFields.get(order.getProperty());
            if (property == null) {
                throw new InvalidRequestException("Cannot sort by '" + order.getProperty()
                    + "'. Sortable fields: " + String.join(", ", sortableFields.keySet()));
            }
            return order.withProperty(property);
        }).toList();
        Sort sort = Sort.by(orders);
        if (orders.stream().noneMatch(o -> o.getProperty().equals("id"))) sort = sort.and(Sort.by("id"));
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }
}
