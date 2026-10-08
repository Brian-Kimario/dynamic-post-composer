package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.LoginRequest;
import com.brian.postcomposer.dto.TokenResponse;
import com.brian.postcomposer.dto.UserResponse;
import com.brian.postcomposer.model.AppUser;
import com.brian.postcomposer.repository.AppUserRepository;
import com.brian.postcomposer.security.AppUserDetails;
import com.brian.postcomposer.security.AuthenticatedUser;
import com.brian.postcomposer.security.RefreshTokenService;
import com.brian.postcomposer.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    static final String REFRESH_COOKIE = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";
    private final AuthService auth;
    private final AppUserRepository users;
    private final RefreshTokenService refreshTokens;
    private final boolean secureCookie;

    public AuthController(AuthService auth, AppUserRepository users, RefreshTokenService refreshTokens,
                          @Value("${app.security.cookie-secure}") boolean secureCookie) {
        this.auth = auth;
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        return withRefreshCookie("Signed in", auth.login(request));
    }

    /** Rotation: the cookie's token is single-use; the response carries a fresh access token and a fresh cookie. */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return withRefreshCookie("Token refreshed", auth.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie("", 0).toString())
            .body(ApiResponse.success("Signed out", null));
    }

    /** Who am I? Reads the principal the JWT filter put in the SecurityContext. */
    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        AppUser u = users.findById(principal.id()).orElseThrow(() -> new BadCredentialsException("Account no longer exists"));
        return ApiResponse.success("Current user", UserResponse.from(AppUserDetails.of(u)));
    }

    private ResponseEntity<ApiResponse<TokenResponse>> withRefreshCookie(String message, AuthService.Session s) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie(s.refreshToken(), refreshTokens.ttl().toSeconds()).toString())
            .body(ApiResponse.success(message, s.tokens()));
    }

    /** HttpOnly (invisible to JS, so XSS cannot steal it), SameSite=Strict (not sent cross-site), scoped to the auth endpoints only. */
    private ResponseCookie cookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_COOKIE, value).httpOnly(true).secure(secureCookie).sameSite("Strict")
            .path(COOKIE_PATH).maxAge(maxAgeSeconds).build();
    }
}
