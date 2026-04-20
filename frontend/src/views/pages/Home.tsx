import { motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap, Layout as LayoutIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
    const fadeIn: Variants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 } as any
    };

    const staggerContainer: Variants = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-300">
                {/* Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob" />
                    <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob animation-delay-2000" />
                    <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-500/10 dark:bg-pink-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten animate-blob animation-delay-4000" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

                        <motion.h1
                            variants={fadeIn}
                            initial="initial"
                            animate="animate"
                            className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6"
                        >
                            Scale your agency <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                                without the chaos
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={fadeIn}
                            initial="initial"
                            animate="animate"
                            transition={{ delay: 0.2 }}
                            className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl leading-relaxed"
                        >
                            AgencyFlow mimics your natural workflow. Manage clients, projects, and creative reviews in one unified workspace designed for modern agencies.
                        </motion.p>

                        <motion.div
                            variants={fadeIn}
                            initial="initial"
                            animate="animate"
                            transition={{ delay: 0.4 }}
                            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                        >
                            <Link
                                to="/signup"
                                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-lg font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
                            >
                                Start Free Trial <ArrowRight size={20} />
                            </Link>
                            
                        </motion.div>
                    </div>

                    {/* Dashboard Preview (Simulated) */}
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-gray-50 dark:bg-gray-900/50" id="features">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Everything an agency needs</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400">
                            Stop switching between 5 different tools. AgencyFlow brings your projects, clients, and team into one powerful platform.
                        </p>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {[
                            {
                                icon: Zap,
                                title: "Lightning Fast Workflow",
                                desc: "Automate repetitive tasks and focus on creative work. Our AI engine handles the boring stuff."
                            },
                            {
                                icon: Users,
                                title: "Client Portal",
                                desc: "Give your clients a professional dashboard to view progress, approve assets, and pay invoices."
                            },
                            {
                                icon: LayoutIcon,
                                title: "Project Management",
                                desc: "Kanban, Gantt, or List view. Manage tasks your way with powerful visual tools."
                            },
                            {
                                icon: CheckCircle2,
                                title: "Automated Reporting",
                                desc: "Send beautiful weekly reports to clients automatically. Keep them in the loop with zero effort. (coming soon)"
                            },
                            {
                                icon: CheckCircle2,
                                title: "Financial Overview",
                                desc: "Track profitability per project, manage invoices, and forecast revenue easily."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                variants={fadeIn}
                                className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <feature.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to transform your agency?</h2>
                    <Link
                        to="/signup"
                        className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 text-lg font-bold px-10 py-4 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        Get Started for Free
                    </Link>
                    <p className="mt-6 text-sm text-gray-500">No credit card required · 14-day free trial</p>
                </div>
            </section>
        </div>
    );
};

export default Home;
