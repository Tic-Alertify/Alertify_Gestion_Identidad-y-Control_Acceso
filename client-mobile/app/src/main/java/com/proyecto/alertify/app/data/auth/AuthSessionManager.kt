package com.proyecto.alertify.app.data.auth

import android.util.Log
import com.proyecto.alertify.app.data.local.TokenStorage
import com.proyecto.alertify.app.network.ApiClient
import com.proyecto.alertify.app.network.ApiResult
import com.proyecto.alertify.app.presentation.session.SessionEvent
import com.proyecto.alertify.app.presentation.session.SessionEventBus

/**
 * T17 – Gestor centralizado de la sesión de autenticación.
 *
 * Encapsula la lógica de negocio sobre el estado de la sesión del usuario,
 * delegando la persistencia al [TokenStorage] subyacente.
 *
 * **Responsabilidades:**
 * - Persistir tokens tras login exitoso.
 * - Verificar si existe sesión activa.
 * - Centralizar el flujo de logout (backend + local + navegación vía evento).
 *
 * Uso típico:
 * ```
 * val manager = AuthSessionManager(tokenStorage, authRepository)
 * if (manager.isLoggedIn()) { /* ir a Home */ }
 *
 * // Logout centralizado – emite evento para navegación
 * manager.logout()
 * ```
 *
 * @param tokenStorage Implementación de [TokenStorage] (inyectada por constructor).
 * @param authRepository Repositorio para llamadas al backend (opcional para logout backend).
 */
class AuthSessionManager(
    private val tokenStorage: TokenStorage,
    private val authRepository: AuthRepository? = null
) {

    /**
     * Persiste ambos tokens tras un login exitoso.
     *
     * @param accessToken  JWT de acceso devuelto por el backend.
     * @param refreshToken Refresh token devuelto por el backend.
     * @throws Exception si la persistencia falla (el llamador debe manejar el error).
     */
    suspend fun onLoginSuccess(accessToken: String, refreshToken: String) {
        tokenStorage.saveAccessToken(accessToken)
        tokenStorage.saveRefreshToken(refreshToken)
    }

    /**
     * Verifica si existe una sesión activa (token almacenado localmente).
     *
     * **Nota:** No valida la expiración del JWT; esa responsabilidad recae en el
     * backend y en el [TokenAuthenticator] que renueva automáticamente.
     *
     * @return `true` si hay un token no vacío almacenado.
     */
    suspend fun isLoggedIn(): Boolean {
        return tokenStorage.getAccessToken() != null
    }

    /**
     * Versión síncrona de [isLoggedIn] para uso en `onCreate` al decidir
     * la ruta de navegación inicial sin necesidad de coroutines.
     *
     * SharedPreferences mantiene los valores en caché en memoria tras la
     * primera lectura, por lo que esta lectura es instantánea.
     */
    fun isLoggedInSync(): Boolean {
        return tokenStorage.getAccessTokenSync() != null
    }

    /**
     * Obtiene el token de acceso actual, si existe.
     *
     * @return El JWT almacenado, o `null` si no hay sesión.
     */
    suspend fun getAccessToken(): String? {
        return tokenStorage.getAccessToken()
    }

    /**
     * T17 – Cierra la sesión del usuario de forma centralizada.
     *
     * Este método realiza el flujo completo de logout:
     * 1. Llama al backend para invalidar el refresh token (blacklist).
     * 2. Limpia los tokens almacenados localmente.
     * 3. Resetea el cliente HTTP para limpiar conexiones.
     * 4. Emite [SessionEvent.LogoutSuccess] para que la UI navegue a login.
     *
     * **Nota:** Si falla la llamada al backend (sin red, token ya inválido),
     * el logout local se ejecuta de todos modos para garantizar que el
     * usuario pueda cerrar sesión incluso sin conectividad.
     *
     * @return `true` si el logout backend fue exitoso, `false` si falló pero
     *         el logout local se completó de todos modos.
     */
    suspend fun logout(): Boolean {
        var backendSuccess = false

        // 1. Intentar logout en backend (best-effort)
        val refreshToken = tokenStorage.getRefreshToken()
        if (refreshToken != null && authRepository != null) {
            val result = authRepository.logout(refreshToken)
            backendSuccess = result is ApiResult.Success
            if (!backendSuccess) {
                Log.w(TAG, "Logout backend falló; continuando con logout local")
            }
        }

        // 2. Limpiar tokens locales (siempre se ejecuta)
        clearSession()

        // 3. Resetear cliente HTTP
        ApiClient.reset()

        // 4. Emitir evento global para navegación
        SessionEventBus.emit(SessionEvent.LogoutSuccess)

        return backendSuccess
    }

    /**
     * Limpia únicamente los tokens locales sin notificar a la UI.
     *
     * Útil cuando se necesita limpiar la sesión pero la navegación
     * se maneja externamente (ej: expiración detectada por TokenAuthenticator).
     */
    suspend fun clearSession() {
        tokenStorage.clear()
    }

    companion object {
        private const val TAG = "AuthSessionManager"
    }
}
