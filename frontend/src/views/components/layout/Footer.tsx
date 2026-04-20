import { Rocket, Twitter, Linkedin, Facebook, Instagram, type LucideIcon } from "lucide-react";

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-50 dark:bg-gray-950 pt-20 pb-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-5 flex flex-col items-center text-center space-y-6">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                <Rocket size={16} fill="currentColor" />
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">AgencyFlow</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                            The all-in-one platform designed to help digital agencies streamline workflows, manage clients, and scale their business effortlessly.
                        </p>
                        <div className="flex justify-center gap-4">
                            {[Twitter, Linkedin, Facebook, Instagram].map((Icon: LucideIcon, idx: number) => (
                                <a
                                    key={idx}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex justify-center items-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                        © {new Date().getFullYear()} AgencyFlow Inc. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
