import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white space-y-6 p-8">
        <h1 className="text-6xl font-bold mb-4">TaskFlow</h1>
        <p className="text-xl mb-8">Управляйте проектами легко и эффективно</p>
        
        <div className="space-x-4">
          <Link 
            to="/login" 
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            Войти
          </Link>
          <Link 
            to="/register" 
            className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition inline-block"
          >
            Регистрация
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Канбан-доски</h3>
            <p className="text-sm">Визуализируйте рабочий процесс</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Командная работа</h3>
            <p className="text-sm">Работайте вместе в реальном времени</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Аналитика</h3>
            <p className="text-sm">Отслеживайте прогресс проектов</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage