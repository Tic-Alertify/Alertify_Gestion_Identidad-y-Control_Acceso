package com.proyecto.alertify.app.network.dto

/**
 * T17 – Response body de `POST /auth/logout` (HTTP 200).
 *
 * @param message Mensaje de confirmación del servidor.
 */
data class LogoutResponse(
    val message: String
)
