import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authService } from '../api/auth';
import type { LoginFormData, LoginViewModel } from '../types';

/**
 * LoginViewModel
 * Manages all state and logic for the Login page.
 * The View (Login.tsx) should only call these methods and display this state.
 */
const useLoginViewModel = (): LoginViewModel => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        rememberMe: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await authService.login(formData.email, formData.password);

            // Redirect based on role
            if (data.role === 'client') {
                navigate('/client-home');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            const axiosErr = err as AxiosError<{ detail?: string }>;
            setError(axiosErr.response?.data?.detail ?? 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (): void => {
        setShowPassword((prev) => !prev);
    };

    return {
        formData,
        isLoading,
        error,
        showPassword,
        handleChange,
        handleSubmit,
        togglePasswordVisibility,
    };
};

export default useLoginViewModel;
