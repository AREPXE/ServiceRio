const { createClient } = supabase;
const supabaseClient = createClient(
    'https://qoojqtavpuigfonunyws.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvb2pxdGF2cHVpZ2ZvbnVueXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3Njg3ODIsImV4cCI6MjA1OTM0NDc4Mn0.u4-fkhMzWyX1OE5RAFjH0usereP0Bu3687_uP4VUFE8'
);

const showLoading = (elementId) => {
    document.getElementById(elementId).style.display = 'block';
};

const hideLoading = (elementId) => {
    document.getElementById(elementId).style.display = 'none';
};

const logout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
        return;
    }
    window.location.href = 'login.html';
};

const getCurrentUser = async () => {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
        console.error('User fetch error:', error);
        window.location.href = 'login.html';
        return null;
    }
    return user;
};