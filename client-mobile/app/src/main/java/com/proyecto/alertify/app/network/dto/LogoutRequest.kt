package com.proyecto.alertify.app.network.dto

import com.google.gson.annotations.SerializedName

/**
 * T17 – Request body para `POST /auth/logout`.
 *
 * Envía el refresh token para invalidarlo en el servidor.
 *
 * @param refreshToken Refresh token vigente a invalidar.
 */
data class LogoutRequest(
    @SerializedName("refresh_token") val refreshToken: String
)
