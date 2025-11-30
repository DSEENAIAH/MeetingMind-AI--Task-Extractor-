import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FiUser, FiLock, FiSave, FiCheck, FiArrowLeft, FiShield, FiEye, FiEyeOff, FiEdit2, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const ProfileSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Profile State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [role, setRole] = useState(''); // Added role state for UI
    const [isEditing, setIsEditing] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Visibility State
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoadingProfile(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('username, full_name, role')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setFullName(data.full_name || '');
                setEmail(user?.email || '');
                setUsername(data.username || '');
                setRole(data.role || '');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMessage(null);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ 
                    full_name: fullName,
                    username: username,
                    role: role,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) {
                setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' });
            } else {
                setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
                setIsEditing(false);
                // Clear success message after 3 seconds
                setTimeout(() => setProfileMessage(null), 3000);
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: 'Error updating profile' });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setSavingPassword(true);
        setPasswordMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                setPasswordMessage({ type: 'error', text: error.message || 'Failed to update password' });
            } else {
                setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Clear success message after 3 seconds
                setTimeout(() => setPasswordMessage(null), 3000);
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'Error updating password' });
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header with Back Button */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-2"
                        >
                            <FiArrowLeft className="mr-2" /> Back
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage your profile information and security settings.
                        </p>
                    </div>
                </div>

                <div className="bg-white shadow-xl rounded-2xl overflow-hidden md:flex min-h-[600px]">
                    {/* Sidebar Navigation */}
                    <div className="md:w-64 bg-gray-50 border-r border-gray-200 p-6">
                        <nav className="space-y-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === 'profile'
                                    ? 'bg-white text-orange-600 shadow-md ring-1 ring-black/5'
                                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                                    }`}
                            >
                                <FiUser className={`mr-3 h-5 w-5 ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'}`} />
                                Public Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === 'security'
                                    ? 'bg-white text-orange-600 shadow-md ring-1 ring-black/5'
                                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                                    }`}
                            >
                                <FiShield className={`mr-3 h-5 w-5 ${activeTab === 'security' ? 'text-orange-500' : 'text-gray-400'}`} />
                                Security
                            </button>
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 lg:p-12">
                        {activeTab === 'profile' && (
                            <div className="max-w-lg animate-fadeIn">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900">Public Profile</h2>
                                    <p className="mt-1 text-gray-500">This information will be displayed to other team members.</p>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    {/* Avatar Placeholder */}
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {fullName ? fullName.charAt(0).toUpperCase() : <FiUser />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{fullName || 'User'}</h3>
                                            <p className="text-sm text-gray-500">{role || 'Team Member'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            name="full_name"
                                            id="full_name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            disabled={!isEditing}
                                            className={`block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm p-3 border transition-all duration-200 ${!isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}`}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                                Username
                                            </label>
                                            <div className="relative rounded-md shadow-sm">
                                                <input
                                                    type="text"
                                                    name="username"
                                                    id="username"
                                                    value={username}
                                                    disabled
                                                    className="block w-full rounded-lg border-gray-200 bg-gray-50 text-gray-500 sm:text-sm p-3 border cursor-not-allowed"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <FiLock className="h-4 w-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email Address
                                            </label>
                                            <div className="relative rounded-md shadow-sm">
                                                <input
                                                    type="text"
                                                    name="email"
                                                    id="email"
                                                    value={email}
                                                    disabled
                                                    className="block w-full rounded-lg border-gray-200 bg-gray-50 text-gray-500 sm:text-sm p-3 border cursor-not-allowed"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <FiLock className="h-4 w-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {profileMessage && (
                                        <div className={`rounded-lg p-4 flex items-center ${profileMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            {profileMessage.type === 'success' ? <FiCheckCircle className="mr-2" /> : <FiAlertCircle className="mr-2" />}
                                            <span className="text-sm font-medium">{profileMessage.text}</span>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end space-x-3">
                                        {!isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all"
                                            >
                                                <FiEdit2 className="mr-2 -ml-1 h-4 w-4" />
                                                Edit Profile
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        fetchProfile(); // Reset changes
                                                    }}
                                                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all"
                                                >
                                                    <FiX className="mr-2 -ml-1 h-4 w-4" />
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={savingProfile}
                                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                                                >
                                                    {savingProfile ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="max-w-lg animate-fadeIn">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                                    <p className="mt-1 text-gray-500">Update your password to keep your account secure.</p>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="space-y-6">
                                    <div>
                                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                name="current_password"
                                                id="current_password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm p-3 border transition-all duration-200"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {showCurrentPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                name="new_password"
                                                id="new_password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm p-3 border transition-all duration-200"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirm_password"
                                                id="confirm_password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm p-3 border transition-all duration-200"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {passwordMessage && (
                                        <div className={`rounded-lg p-4 flex items-center ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            {passwordMessage.type === 'success' ? <FiCheckCircle className="mr-2" /> : <FiAlertCircle className="mr-2" />}
                                            <span className="text-sm font-medium">{passwordMessage.text}</span>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={savingPassword}
                                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                                        >
                                            {savingPassword ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper icons (if not imported)
const FiCheckCircle = ({ className }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const FiAlertCircle = ({ className }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default ProfileSettings;
