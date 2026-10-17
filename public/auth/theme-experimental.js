(function (global) {
    const theme = global.GoldenNotesTheme;
    if (!theme) {
        console.error('theme.js must load before theme-experimental.js');
        return;
    }

    function isExperimentalThemeActive() {
        return document.documentElement.getAttribute('data-theme') === 'experimental';
    }

    async function initExperimentalThemeFromUser() {
        const client = theme.getClient();
        if (!client) return null;

        try {
            const { data: { user }, error: authError } = await client.auth.getUser();
            if (authError || !user) return null;

            const { data, error } = await client
                .from('settings')
                .select('experimental-mode')
                .eq('user-uuid', user.id)
                .maybeSingle();

            if (error) {
                console.error('settings fetch failed:', error.message);
                return null;
            }

            const isExperimental = !!(data && data['experimental-mode']);
            theme.applyExperimentalTheme(isExperimental);
            return isExperimental;
        } catch (err) {
            console.error('initExperimentalThemeFromUser exception:', err);
            return null;
        }
    }

    async function updateExperimentalThemePreference(isExperimentalMode) {
        const client = theme.getClient();
        if (!client) {
            return { error: new Error('Supabase client unavailable') };
        }

        try {
            const { data: { user }, error: authError } = await client.auth.getUser();
            if (authError || !user) {
                return { error: new Error('Not logged in') };
            }

            const payload = { 'experimental-mode': !!isExperimentalMode };

            const { data: updated, error: updateError } = await client
                .from('settings')
                .update(payload)
                .eq('user-uuid', user.id)
                .select();

            if (updateError) {
                console.error('settings update failed:', updateError.message);
                return { error: updateError };
            }

            if (updated && updated.length > 0) {
                theme.applyExperimentalTheme(!!isExperimentalMode);
                return { data: updated[0], error: null };
            }

            const { data: inserted, error: insertError } = await client
                .from('settings')
                .insert([{ 'user-uuid': user.id, 'experimental-mode': !!isExperimentalMode }])
                .select();

            if (insertError) {
                console.error('settings insert failed:', insertError.message);
                return { error: insertError };
            }

            theme.applyExperimentalTheme(!!isExperimentalMode);
            return { data: inserted && inserted[0], error: null };
        } catch (err) {
            console.error('updateExperimentalThemePreference exception:', err);
            return { error: err };
        }
    }

    Object.assign(theme, {
        initExperimentalThemeFromUser,
        updateExperimentalThemePreference,
        isExperimentalThemeActive
    });
})(window);
