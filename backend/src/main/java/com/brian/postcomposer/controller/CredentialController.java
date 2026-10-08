package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.CredentialRequest;
import com.brian.postcomposer.dto.CredentialResponse;
import com.brian.postcomposer.security.AuthenticatedUser;
import com.brian.postcomposer.service.CredentialService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/** Connected social accounts. Tokens are write-only; each user can only ever touch their own rows. */
@RestController
@Validated
@RequestMapping("/api/v1/credentials")
@PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
public class CredentialController {
    private final CredentialService service;

    public CredentialController(CredentialService service) { this.service = service; }

    @GetMapping
    public ApiResponse<List<CredentialResponse>> list(@AuthenticationPrincipal AuthenticatedUser me) {
        return ApiResponse.success("Connected accounts", service.list(me.id()));
    }

    @PutMapping("/{provider}")
    public ApiResponse<CredentialResponse> save(@AuthenticationPrincipal AuthenticatedUser me,
            @PathVariable @Pattern(regexp = "[a-z0-9-]{1,40}", message = "Provider must be 1-40 chars of a-z, 0-9, -") String provider,
            @Valid @RequestBody CredentialRequest request) {
        return ApiResponse.success("Credential stored", service.save(me.id(), provider, request));
    }

    @DeleteMapping("/{provider}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal AuthenticatedUser me, @PathVariable String provider) {
        service.delete(me.id(), provider);
        return ApiResponse.success("Credential removed", null);
    }
}
