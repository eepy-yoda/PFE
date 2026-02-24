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
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary dark:bg-gray-800 text-secondary-foreground dark:text-gray-300 text-sm font-medium mb-8 border border-gray-100 dark:border-gray-800"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            v2.0 is now live
                        </motion.div>

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
                            <Link
                                to="#"
                                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 text-lg font-semibold px-8 py-4 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300"
                            >
                                View Demo
                            </Link>
                        </motion.div>
                    </div>

                    {/* Dashboard Preview (Simulated) */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mt-20 relative mx-auto max-w-6xl"
                    >
                        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9] lg:aspect-[2/1]">
                            {/* Mock UI Content */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-950/50" />
                            <div className="relative p-6 h-full flex flex-col">
                                {/* Header Mock */}
                                <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-green-400" />
                                    </div>
                                </div>
                                {/* Body Mock */}
                                <div className="grid grid-cols-12 gap-6 h-full">
                                    <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100/50 p-4 space-y-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-10 bg-gray-50 rounded-lg w-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                        ))}
                                    </div>
                                    <div className="col-span-9 bg-white rounded-xl shadow-sm border border-gray-100/50 p-6">
                                        <div className="h-8 bg-gray-50 rounded-lg w-1/3 mb-6 animate-pulse" />
                                        <div className="grid grid-cols-3 gap-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-32 bg-gray-50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
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
                                desc: "Send beautiful weekly reports to clients automatically. Keep them in the loop with zero effort."
                            },
                            {
                                icon: CheckCircle2,
                                title: "Asset Management",
                                desc: "Store, organize, and share creative assets with version control built right in."
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
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        Join 2,000+ agencies utilizing AgencyFlow to scale faster and deliver better results.
                    </p>
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
