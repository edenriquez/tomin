import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                    <span className="text-2xl font-bold text-gray-900">Tomin</span>
                    <p className="text-sm text-gray-500 mt-1">© {new Date().getFullYear()} Tomin. All rights reserved.</p>
                </div>
                <div className="flex space-x-6">
                    <Link href="/login" className="text-gray-600 hover:text-purple-600 transition-colors">
                        Login
                    </Link>
                    <Link href="#" className="text-gray-600 hover:text-purple-600 transition-colors">
                        Privacy
                    </Link>
                    <Link href="#" className="text-gray-600 hover:text-purple-600 transition-colors">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
