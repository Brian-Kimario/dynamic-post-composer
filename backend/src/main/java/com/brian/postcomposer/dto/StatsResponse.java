package com.brian.postcomposer.dto;

import java.util.List;

public record StatsResponse(List<PlatformStatusCount> byPlatformAndStatus, List<AuthorActivity> topAuthors,
                            List<TopPost> topPosts) {
    public record TopPost(String id, String content, String platformId, String author, int likes) {}
    public record PlatformStatusCount(String platformId, String status, long total) {}
    public record AuthorActivity(String author, long total) {}
}
