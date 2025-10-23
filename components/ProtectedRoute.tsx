import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    // FIX: Changed type from 'JSX.Element' to 'React.ReactElement' to avoid dependency on a global JSX namespace
    // that may not be available in the current TypeScript configuration.
    children: React.ReactElement;
    roles?: ('admin' | 'super')[];
    systemAdminOnly?: boolean;
    requireSystemAdminForSchoolPage?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, systemAdminOnly = false, requireSystemAdminForSchoolPage = false }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const { id_school } = useParams<{ id_school: string }>();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        const redirectTo = systemAdminOnly ? "/system-admin/login" : `/${id_school}/login`;
        // Redirect them to the appropriate login page
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    
    if (requireSystemAdminForSchoolPage) {
        const isSystemAdmin = user.role === 'super' && user.id_school === null;
        if (!isSystemAdmin) {
            // If not a system admin, deny access and redirect to their dashboard
            const redirectTo = user.id_school ? `/${id_school}/dashboard` : `/system-admin/dashboard`;
            return <Navigate to={redirectTo} replace />;
        }
    }

    // Handle system admin route protection
    if (systemAdminOnly) {
        const isSystemAdmin = user.role === 'super' && user.id_school === null;
        if (!isSystemAdmin) {
             // If not a system admin, kick them back to the main school selector
             return <Navigate to="/" replace />;
        }
        return children; // Access granted for system admin
    }

    // Handle school-specific route protection
    // Security Check: Ensure the logged-in user belongs to the school they are trying to access
    // System admins are exempt from this check for viewing purposes.
    if (user.id_school && user.id_school !== id_school) {
        // User is from a different school. Redirect to their own dashboard.
        return <Navigate to={`/${user.id_school}/dashboard`} replace />;
    }

    if (roles && roles.length > 0 && !roles.includes(user.role)) {
        // User is logged in but does not have the required role, redirect to their school's dashboard or system dashboard
        const redirectTo = user.id_school ? `/${id_school}/dashboard` : `/system-admin/dashboard`;
        return <Navigate to={redirectTo} replace />;
    }
    
    return children;
};

export default ProtectedRoute;