package com.brian.postcomposer.dto;

import java.util.List;

public record StatsResponse(List<PlatformStatusCount> byPlatformAndStatus, List<AuthorActivity> topAuthors) {
    public record PlatformStatusCount(String platformId, String status, long total) {}
    public record AuthorActivity(String author, long total) {}
}
