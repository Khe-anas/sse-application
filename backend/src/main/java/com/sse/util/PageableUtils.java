package com.sse.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

public final class PageableUtils {

    private static final int MAX_PAGE_SIZE = 100;

    private PageableUtils() {
    }

    public static Pageable create(
            int page,
            int size,
            String sort,
            String defaultSortField,
            Sort.Direction defaultDirection,
            Set<String> allowedSortFields) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = defaultSortField;
        Sort.Direction direction = defaultDirection;

        if (sort != null && !sort.isBlank()) {
            String[] sortParams = sort.split(",", 2);
            String requestedField = sortParams[0].trim();
            if (allowedSortFields.contains(requestedField)) {
                sortField = requestedField;
            }

            if (sortParams.length > 1) {
                String requestedDirection = sortParams[1].trim();
                if ("asc".equalsIgnoreCase(requestedDirection)) {
                    direction = Sort.Direction.ASC;
                } else if ("desc".equalsIgnoreCase(requestedDirection)) {
                    direction = Sort.Direction.DESC;
                }
            }
        }

        return PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));
    }
}
