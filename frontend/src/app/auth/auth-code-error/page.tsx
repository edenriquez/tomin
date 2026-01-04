export default function AuthCodeError() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold mb-4">Error de autenticación</h1>
            <p className="text-gray-600 mb-6">Hubo un problema al procesar tu inicio de sesión. Por favor intenta de nuevo.</p>
            <a href="/login" className="bg-[#135bec] text-white px-6 py-2 rounded-lg font-bold">
                Volver al inicio
            </a>
        </div>
    )
}
