package com.brian.postcomposer.dto;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;

/**
 * A lean page envelope. Spring's own {@code Page} serialises its whole {@code Pageable}/{@code Sort} object graph
 * (and Spring Data warns against exposing it); this carries only what a client needs to render a pager.
 * {@code page} is zero-based, matching the {@code page} query parameter.
 */
public record PageResponse<T>(
    List<T> items, int page, int size, long totalElements, int totalPages,
    boolean hasNext, boolean hasPrevious, List<String> sort
) {
    public static <S, T> PageResponse<T> of(Page<S> page, java.util.function.Function<S, T> mapper) {
        return new PageResponse<>(
            page.getContent().stream().map(mapper).toList(), page.getNumber(), page.getSize(),
            page.getTotalElements(), page.getTotalPages(), page.hasNext(), page.hasPrevious(),
            page.getSort().stream().map(PageResponse::describe).toList());
    }

    private static String describe(Sort.Order order) { return order.getProperty() + "," + order.getDirection().name().toLowerCase(); }
}
