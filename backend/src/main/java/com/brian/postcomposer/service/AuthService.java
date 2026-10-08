package com.brian.postcomposer.service;

import com.brian.postcomposer.dto.LoginRequest;
import com.brian.postcomposer.dto.TokenResponse;
import com.brian.postcomposer.dto.UserResponse;
import com.brian.postcomposer.repository.AppUserRepository;
import com.brian.postcomposer.security.AppUserDetails;
import com.brian.postcomposer.security.JwtService;
import com.brian.postcomposer.security.RefreshTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final AuthenticationManager authenticationManager;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final AppUserRepository users;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwt, RefreshTokenService refreshTokens, AppUserRepository users) {
        this.authenticationManager = authenticationManager;
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
        this.users = users;
    }

    /** Access token goes in the body (kept in memory by the client); the raw refresh token goes in an HttpOnly cookie. */
    public record Session(TokenResponse tokens, String refreshToken) {}

    /** Wrong email and wrong password are indistinguishable to the caller (BadCredentialsException either way). */
    public Session login(LoginRequest request) {
        var auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password()));
        AppUserDetails user = (AppUserDetails) auth.getPrincipal();
        log.info("User {} ({}) signed in", user.id(), user.role());
        return new Session(tokens(user), refreshTokens.startSession(user.id()).rawToken());
    }

    /** Exchange a refresh token for a new access token AND a new refresh token (rotation). */
    public Session refresh(String presentedRefreshToken) {
        if (presentedRefreshToken == null || presentedRefreshToken.isBlank()) throw new BadCredentialsException("Invalid refresh token");
        var next = refreshTokens.rotate(presentedRefreshToken);
        AppUserDetails user = users.findById(next.userId()).map(AppUserDetails::of).filter(AppUserDetails::isEnabled)
            .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        return new Session(tokens(user), next.rawToken());
    }

    public void logout(String presentedRefreshToken) {
        if (presentedRefreshToken != null && !presentedRefreshToken.isBlank()) refreshTokens.revoke(presentedRefreshToken);
    }

    private TokenResponse tokens(AppUserDetails user) {
        return new TokenResponse(jwt.issueAccessToken(user), "Bearer", jwt.accessTtl().toSeconds(), UserResponse.from(user));
    }
}
