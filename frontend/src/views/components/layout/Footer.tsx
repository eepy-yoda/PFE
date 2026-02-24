import { Rocket, Twitter, Linkedin, Facebook, Instagram, type LucideIcon } from "lucide-react";

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-100">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                <Rocket size={16} fill="currentColor" />
                            </div>
                            <span className="text-lg font-bold text-gray-900">AgencyFlow</span>
                        </div>
                        <p className="text-gray-500 leading-relaxed max-w-sm">
                            The all-in-one platform designed to help digital agencies streamline workflows, manage clients, and scale their business effortlessly.
                        </p>
                        <div className="flex gap-4">
                            {[Twitter, Linkedin, Facebook, Instagram].map((Icon: LucideIcon, idx: number) => (
                                <a
                                    key={idx}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-6">Product</h4>
                        <ul className="space-y-4">
                            {['Features', 'Pricing', 'Integrations', 'Changelog', 'Docs'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-gray-500 hover:text-primary transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-6">Company</h4>
                        <ul className="space-y-4">
                            {['About Us', 'Careers', 'Blog', 'Contact', 'Partners'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-gray-500 hover:text-primary transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-6">Legal</h4>
                        <ul className="space-y-4">
                            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-gray-500 hover:text-primary transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} AgencyFlow Inc. All rights reserved.
                    </p>
                    <div className="flex gap-8">
                        <a href="#" className="text-gray-400 hover:text-gray-600 text-sm">Privacy</a>
                        <a href="#" className="text-gray-400 hover:text-gray-600 text-sm">Terms</a>
                        <a href="#" className="text-gray-400 hover:text-gray-600 text-sm">Cookies</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
