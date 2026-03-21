package com.proyecto.alertify.app

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.proyecto.alertify.app.data.auth.AuthRepository
import com.proyecto.alertify.app.data.auth.AuthSessionManager
import com.proyecto.alertify.app.data.local.SharedPrefsTokenStorage
import com.proyecto.alertify.app.network.ApiClient
import com.proyecto.alertify.app.presentation.session.SessionEvent
import com.proyecto.alertify.app.presentation.session.SessionEventBus
import kotlinx.coroutines.launch

/**
 * T17 – Pantalla principal de la aplicación una vez autenticado.
 *
 * De momento actúa como placeholder; incluye un botón de logout
 * para validar el flujo completo de persistencia de sesión.
 *
 * **Comportamiento de sesión:**
 * - Verifica en `onCreate` que exista una sesión válida; si no, redirige a login.
 * - Observa [SessionEventBus] para reaccionar a logout y expiración de sesión
 *   de forma lifecycle-safe (solo mientras la Activity está en STARTED).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var sessionManager: AuthSessionManager
    private lateinit var tokenStorage: SharedPrefsTokenStorage

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Inicializar dependencias ──────────────────────────────────────────
        tokenStorage = SharedPrefsTokenStorage(applicationContext)
        val authApi = ApiClient.getAuthApi(tokenStorage)
        val authRepository = AuthRepository(authApi)
        sessionManager = AuthSessionManager(tokenStorage, authRepository)

        // ── T17: Verificar sesión antes de mostrar contenido ──────────────────
        if (!sessionManager.isLoggedInSync()) {
            NavigationHelper.navigateToLogin(this)
            return // No continuar con la inicialización de la UI
        }

        setContentView(R.layout.activity_main)

        val tvWelcome = findViewById<TextView>(R.id.tv_welcome)
        val btnLogout = findViewById<Button>(R.id.btn_logout)

        tvWelcome.text = getString(R.string.welcome_message)

        // ── T17: Logout centralizado – delega toda la lógica a AuthSessionManager
        btnLogout.setOnClickListener {
            btnLogout.isEnabled = false // Evitar doble click
            lifecycleScope.launch {
                sessionManager.logout()
                // La navegación se realiza vía SessionEventBus (LogoutSuccess)
            }
        }

        // ── Observar eventos de sesión (SharedFlow – lifecycle-safe) ──────────
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                SessionEventBus.events.collect { event ->
                    handleSessionEvent(event)
                }
            }
        }
    }

    /**
     * Maneja los eventos globales de sesión emitidos por [SessionEventBus].
     *
     * Tanto el logout manual como la expiración automática navegan a LoginActivity,
     * pero muestran mensajes diferentes para informar al usuario del motivo.
     */
    private fun handleSessionEvent(event: SessionEvent) {
        when (event) {
            is SessionEvent.SessionExpired -> {
                Toast.makeText(
                    this,
                    getString(R.string.session_expired),
                    Toast.LENGTH_LONG
                ).show()
                NavigationHelper.navigateToLogin(this)
            }
            is SessionEvent.LogoutSuccess -> {
                Toast.makeText(
                    this,
                    getString(R.string.logout_success),
                    Toast.LENGTH_SHORT
                ).show()
                NavigationHelper.navigateToLogin(this)
            }
        }
    }
}
