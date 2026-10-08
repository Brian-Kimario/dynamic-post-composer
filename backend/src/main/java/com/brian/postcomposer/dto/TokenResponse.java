package com.brian.postcomposer.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {}
