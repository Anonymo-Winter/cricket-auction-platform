import ErrorState from "./components/ErrorState";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import 'antd/dist/reset.css';
import NavBar from './components/NavBar.jsx';
import StatsPage from './pages/StatsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import DashBoard from './pages/AdminDashBoard.jsx';
import AuctionsDisplay from './components/Allauctions.jsx';
import AdminAuctionDetails from './components/AdminAuctionDetails.jsx';
import AdminTeamsDetails from './components/AdminTeamDetails.jsx';
import { useGetCurrentUserQuery } from './api/authApi.js';
import { clearCredentials, setCredentials } from './store/authSlice.js';
import LoadSpinner from './components/LoadSpinner.jsx';
import AdminAuctionsView from './components/AdminAuctionsView.jsx';
import AdminTeamsView from './components/AdminTeamsView.jsx';
import AdminCreateTeam from './components/AdminCreateTeam.jsx';
import AdminCreatePlayer from './components/AdminCreatePlayer.jsx';
import AdminsPlayerView from './components/AdminPlayerView.jsx';
import AdminPlayerDetails from './components/AdminPlayerDetails.jsx';
import AdminAccessControl from './components/AccessCtrl.jsx';
import AdminCreateNewAuction from './components/AdminCreateNewAuction.jsx';
import AdminSettings from './components/AdminSettings.jsx';
import AdminPanelDashboard from './components/AdminPanelDashboard.jsx';
import AuctioneerAssignedAuctions from './pages/AuctioneerAssignedAuctions.jsx';
import AuctioneerControlAuction from './pages/AuctioneerControlAuction.jsx';
import AuctionHistoryDashboard from './pages/AuctionHistoryDashboard.jsx';
import RegisterToAuction from './pages/RegisterToAuction.jsx';
import PlayerDetails from './pages/PlayerDetails.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage.jsx';
import SetPasswordPage from './pages/SetPasswordPage.jsx';
import AuctionBigScreen from './pages/AuctionBigScreen.jsx';
import AuctionSquads from './pages/AuctionSquads.jsx';
import AuctionStatsPage from './pages/AuctionStatsPage.jsx';
import AuthLayout from './components/AuthLayout.jsx';
import { ROLES, postLoginPath, roleHome } from './lib/roles.js';

// Permission mapping to define what each role can access
const PERMISSIONS = {
    // Dashboard access levels
    viewDashboard: [ROLES.ADMIN],

    // Auction permissions
    conductAuction: [ROLES.AUCTIONEER, ROLES.ADMIN],
    registerToAuction: [ROLES.USER],
    viewAuctions: [ROLES.USER, ROLES.AUCTIONEER, ROLES.ADMIN],
    createAuction: [ROLES.ADMIN],
    editAuction: [ROLES.ADMIN],
    deleteAuction: [ROLES.ADMIN],

    // Team permissions
    viewTeams: [ROLES.USER, ROLES.AUCTIONEER, ROLES.ADMIN],
    createTeam: [ROLES.ADMIN],
    editTeam: [ROLES.ADMIN],
    deleteTeam: [ROLES.ADMIN],

    // Player permissions
    viewPlayers: [ROLES.USER, ROLES.AUCTIONEER, ROLES.ADMIN],
    createPlayer: [ROLES.ADMIN],
    editPlayer: [ROLES.ADMIN],
    deletePlayer: [ROLES.ADMIN],

    // Access control and settings
    manageUsers: [ROLES.ADMIN],
    manageSettings: [ROLES.ADMIN],
};

// Check if user has permission
const hasPermission = (userRole, requiredPermission) => {
    if (!userRole || !requiredPermission) return false;
    return PERMISSIONS[requiredPermission]?.includes(userRole) || false;
};

// Route Guards
const PrivateRoute = ({ children, requiredPermission }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to='/login' state={{ from: location }} replace />;
    }

    if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
        return <Navigate to='/unauthorized' replace />;
    }

    return children;
};

const RedirectAuthenticatedUser = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const location = useLocation();
    const authPages = ['/login', '/signup'];

    if (isAuthenticated && authPages.includes(location.pathname)) {
        return <Navigate to={postLoginPath(user?.role, location.state?.from?.pathname)} replace />;
    }

    return children;
};

// "/" has no page of its own: send people to the screen that suits them
const HomeRedirect = () => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    return <Navigate to={isAuthenticated ? roleHome(user?.role) : '/auctions'} replace />;
};

const App = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const {
        data: user,
        error,
        isLoading,
    } = useGetCurrentUserQuery(undefined, {
        refetchOnMountOrArgChange: false,
    });

    useEffect(() => {
        if (user) {
            dispatch(setCredentials(user.user));
        }
        // Only sign out when the server says the session is invalid, not when it's merely unreachable
        if (error && (error.status === 401 || error.status === 403)) {
            dispatch(clearCredentials());
        }
    }, [user, error, dispatch]);

    if (isLoading) {
        return <LoadSpinner />;
    }

    const hideNavBarOn = ['/dashboard', '/login', '/signup', '/invite', '/reset'];
    const isBigScreen = /^\/auction\/[^/]+\/screen$/.test(location.pathname);
    const showNavBar = !isBigScreen && !hideNavBarOn.some((path) => location.pathname.startsWith(path));

    return (
        <div className='min-h-screen bg-slate-50 relative overflow-hidden'>
            {showNavBar && <NavBar />}
            <RouteErrorBoundary key={location.pathname}>
            <Routes>
                {/* Public Routes */}
                <Route path='/' element={<HomeRedirect />} />
                <Route
                    path='/login'
                    element={
                        <AuthLayout>
                            <RedirectAuthenticatedUser>
                                <LoginPage />
                            </RedirectAuthenticatedUser>
                        </AuthLayout>
                    }
                />
                <Route
                    path='/signup'
                    element={
                        <AuthLayout>
                            <RedirectAuthenticatedUser>
                                <SignupPage />
                            </RedirectAuthenticatedUser>
                        </AuthLayout>
                    }
                />
                <Route
                    path='/invite/:token'
                    element={
                        <AuthLayout>
                            <SetPasswordPage />
                        </AuthLayout>
                    }
                />
                <Route
                    path='/reset/:token'
                    element={
                        <AuthLayout>
                            <SetPasswordPage />
                        </AuthLayout>
                    }
                />
                <Route path='/auctions' element={<AuctionsDisplay />} />
                <Route
                    path='/register/:auctionId'
                    element={
                        <PrivateRoute requiredPermission='registerToAuction'>
                            <RegisterToAuction />
                        </PrivateRoute>
                    }
                />
                <Route path='/player/:playerId' element={<PlayerDetails />} />
                <Route path='/stats' element={<StatsPage />} />
                <Route path='/stats/auctions' element={<AuctionStatsPage />} />
                <Route path='/auction/:id/screen' element={<AuctionBigScreen />} />
                <Route path='/auction/:id/squads' element={<AuctionSquads />} />
                <Route path='/unauthorized' element={<UnauthorizedPage />} />

                {/* Protected User Routes */}
                <Route
                    path='/settings'
                    element={
                        <PrivateRoute>
                            <ProfilePage />
                        </PrivateRoute>
                    }
                />

                <Route
                    path='/assignedAuctions'
                    element={
                        <PrivateRoute requiredPermission='conductAuction'>
                            <AuctioneerAssignedAuctions />
                        </PrivateRoute>
                    }
                />
                <Route
                    path='/assignedAuctions/:id'
                    element={
                        <PrivateRoute requiredPermission='conductAuction'>
                            <AuctioneerControlAuction />
                        </PrivateRoute>
                    }
                />

                <Route
                    path='/auction/:id'
                    element={
                        // <PrivateRoute requiredPermission="viewAuctions">
                        <AuctioneerControlAuction />
                        // </PrivateRoute>
                    }
                />

                <Route path='/auction/cpltd/:id' element={<AuctionHistoryDashboard />} />

                {/* Admin Dashboard Routes */}
                <Route
                    path='/dashboard'
                    element={
                        <PrivateRoute requiredPermission='viewDashboard'>
                            <DashBoard />
                        </PrivateRoute>
                    }
                >
                    <Route
                        path=''
                        element={
                            <PrivateRoute requiredPermission='viewDashboard'>
                                <AdminPanelDashboard />
                            </PrivateRoute>
                        }
                    />

                    {/* Auction Management Routes */}
                    <Route
                        path='auctions'
                        element={
                            <PrivateRoute requiredPermission='viewAuctions'>
                                <AdminAuctionsView />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='auctions/create'
                        element={
                            <PrivateRoute requiredPermission='createAuction'>
                                <AdminCreateNewAuction />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='auctions/:id'
                        element={
                            <PrivateRoute requiredPermission='editAuction'>
                                <AdminAuctionDetails />
                            </PrivateRoute>
                        }
                    />

                    {/* Team Management Routes */}
                    <Route
                        path='teams'
                        element={
                            <PrivateRoute requiredPermission='viewTeams'>
                                <AdminTeamsView />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='teams/create'
                        element={
                            <PrivateRoute requiredPermission='createTeam'>
                                <AdminCreateTeam />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='teams/:id'
                        element={
                            <PrivateRoute requiredPermission='editTeam'>
                                <AdminTeamsDetails />
                            </PrivateRoute>
                        }
                    />

                    {/* Player Management Routes */}
                    <Route
                        path='players'
                        element={
                            <PrivateRoute requiredPermission='viewPlayers'>
                                <AdminsPlayerView />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='players/create'
                        element={
                            <PrivateRoute requiredPermission='createPlayer'>
                                <AdminCreatePlayer />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='players/:id'
                        element={
                            <PrivateRoute requiredPermission='editPlayer'>
                                <AdminPlayerDetails />
                            </PrivateRoute>
                        }
                    />

                    {/* Admin-only Routes */}
                    <Route
                        path='accessctrl'
                        element={
                            <PrivateRoute requiredPermission='manageUsers'>
                                <AdminAccessControl />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='settings'
                        element={
                            <PrivateRoute requiredPermission='manageSettings'>
                                <AdminSettings />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path='*'
                        element={
                            <ErrorState
                                inline
                                kind='not-found'
                                title='Page not found'
                                hint="This admin page doesn't exist."
                                backTo='/dashboard'
                                backLabel='Back to dashboard'
                            />
                        }
                    />
                </Route>

                {/* Fallback Route */}
                <Route
                    path='*'
                    element={
                        <ErrorState
                            kind='not-found'
                            title='Page not found'
                            hint="That address doesn't exist. Check the link, or head back to the auctions."
                            backTo='/auctions'
                            backLabel='Go to auctions'
                        />
                    }
                />
            </Routes>
            </RouteErrorBoundary>
        </div>
    );
};

export default App;
