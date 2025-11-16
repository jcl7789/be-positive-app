export default function Offline() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-amber-50">
      <h1 className="text-3xl font-extrabold text-teal-700 mb-6">📶 Sin Conexión</h1>
      
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full">
        <p className="text-lg text-gray-800 mb-4">
          Parece que no tienes conexión a internet en este momento.
        </p>
        
        <p className="text-gray-600 mb-6">
          La última frase que viste está disponible localmente si la aplicación fue instalada como PWA.
        </p>
        
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors font-medium"
        >
          Reintentar Conexión
        </button>
      </div>
    </main>
  );
}
