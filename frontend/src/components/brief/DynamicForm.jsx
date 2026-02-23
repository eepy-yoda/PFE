import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChevronRight, AlertCircle } from 'lucide-react';

const DynamicForm = ({ schema, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleFieldChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        const newErrors = {};
        schema.fields.forEach(field => {
            if (field.required && !formData[field.key]) {
                newErrors[field.key] = `${field.label} is required`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-3xl p-8 space-y-8"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">{schema.title || 'Project Details'}</h2>
                <p className="text-gray-500">Please provide the following information to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {schema.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1 flex justify-between">
                            {field.label}
                            {field.required && <span className="text-red-500 font-normal">* Required</span>}
                        </label>

                        {field.type === 'textarea' ? (
                            <textarea
                                value={formData[field.key] || ''}
                                onChange={e => handleFieldChange(field.key, e.target.value)}
                                className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all h-32 resize-none ${errors[field.key] ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'
                                    }`}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                        ) : field.type === 'select' ? (
                            <select
                                value={formData[field.key] || ''}
                                onChange={e => handleFieldChange(field.key, e.target.value)}
                                className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all appearance-none ${errors[field.key] ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'
                                    }`}
                            >
                                <option value="">Select an option...</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={field.type || 'text'}
                                value={formData[field.key] || ''}
                                onChange={e => handleFieldChange(field.key, e.target.value)}
                                className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all ${errors[field.key] ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-primary/20 focus:border-primary'
                                    }`}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                        )}

                        {errors[field.key] && (
                            <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {errors[field.key]}
                            </p>
                        )}
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-8"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            <span>Continue</span>
                            <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
};

export default DynamicForm;
