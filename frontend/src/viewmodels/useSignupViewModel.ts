import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authService } from '../api/auth';
import type { SignupFormData, SignupViewModel, RegisterPayload } from '../types';

/**
 * SignupViewModel
 * Manages all state and logic for the Signup page.
 * The View (Signup.tsx) should only call these methods and display this state.
 */
const useSignupViewModel = (): SignupViewModel => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [isAgency, setIsAgency] = useState<boolean>(true);

    const [formData, setFormData] = useState<SignupFormData>({
        fullName: '',
        email: '',
        agencyName: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAgencyToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setIsAgency(!e.target.checked);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const payload: RegisterPayload = {
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                agency_name: isAgency ? formData.agencyName : null,
                role: isAgency ? 'manager' : 'client',
            };

            await authService.register(payload);
            setIsSuccess(true);

            // Auto-navigate after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 5000);
        } catch (err) {
            console.error('FULL SIGNUP ERROR:', err);
            const axiosErr = err as AxiosError<{ detail?: string; error_description?: string }>;
            const errorMessage =
                (err as Error).message ||
                axiosErr.response?.data?.error_description ||
                axiosErr.response?.data?.detail ||
                'Registration failed.';
            setError(errorMessage);
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
        isSuccess,
        isAgency,
        handleChange,
        handleAgencyToggle,
        handleSubmit,
        togglePasswordVisibility,
    };
};

export default useSignupViewModel;
