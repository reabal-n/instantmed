module.exports = [
"[project]/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://witzcrovsoumktyndqgz.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdHpjcm92c291bWt0eW5kcWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzQ0MzAsImV4cCI6MjA4MDc1MDQzMH0.R08q2HBIATIzdrwOVzhX8feApi8ZZIdr3pcVzQlRC-0"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The "setAll" method was called from a Server Component.
                // This can be ignored if you have middleware refreshing user sessions.
                }
            }
        }
    });
}
}),
"[project]/app/actions/account.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0024a1ef766fd566730501fc08bc73f2ecdd967040":"deleteAccount","40ed82d4821823db5eba8f0fb94021db6ee74e1bc9":"requestPasswordReset","606aaa182cd1cd432083ff0a2a408e0b45f539d245":"updateNotificationPreferences","60a91611958ef0b634506ef7710b44368540e143b4":"changePassword"},"",""] */ __turbopack_context__.s([
    "changePassword",
    ()=>changePassword,
    "deleteAccount",
    ()=>deleteAccount,
    "requestPasswordReset",
    ()=>requestPasswordReset,
    "updateNotificationPreferences",
    ()=>updateNotificationPreferences
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function changePassword(currentPassword, newPassword) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return {
            success: false,
            error: "Not authenticated"
        };
    }
    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    });
    if (signInError) {
        return {
            success: false,
            error: "Current password is incorrect"
        };
    }
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });
    if (updateError) {
        return {
            success: false,
            error: updateError.message
        };
    }
    return {
        success: true,
        error: null
    };
}
async function requestPasswordReset(email) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${("TURBOPACK compile-time value", "http://localhost:3000")}/auth/reset-password`
    });
    if (error) {
        return {
            success: false,
            error: error.message
        };
    }
    return {
        success: true,
        error: null
    };
}
async function deleteAccount() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return {
            success: false,
            error: "Not authenticated"
        };
    }
    // Soft delete - mark profile as deleted
    const { error: updateError } = await supabase.from("profiles").update({
        full_name: "Deleted User",
        phone: null,
        address_line1: null,
        suburb: null,
        state: null,
        postcode: null,
        medicare_number: null,
        medicare_irn: null,
        medicare_expiry: null
    }).eq("auth_user_id", user.id);
    if (updateError) {
        return {
            success: false,
            error: updateError.message
        };
    }
    // Sign out the user
    await supabase.auth.signOut();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return {
        success: true,
        error: null
    };
}
async function updateNotificationPreferences(emailNotifications, smsNotifications) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return {
            success: false,
            error: "Not authenticated"
        };
    }
    const { error } = await supabase.from("profiles").update({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications
    }).eq("auth_user_id", user.id);
    if (error) {
        return {
            success: false,
            error: error.message
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/patient/settings");
    return {
        success: true,
        error: null
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    changePassword,
    requestPasswordReset,
    deleteAccount,
    updateNotificationPreferences
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(changePassword, "60a91611958ef0b634506ef7710b44368540e143b4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(requestPasswordReset, "40ed82d4821823db5eba8f0fb94021db6ee74e1bc9", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteAccount, "0024a1ef766fd566730501fc08bc73f2ecdd967040", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateNotificationPreferences, "606aaa182cd1cd432083ff0a2a408e0b45f539d245", null);
}),
"[project]/.next-internal/server/app/auth/forgot-password/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/account.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$account$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/account.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/auth/forgot-password/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/account.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "40ed82d4821823db5eba8f0fb94021db6ee74e1bc9",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$account$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requestPasswordReset"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$auth$2f$forgot$2d$password$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$account$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/auth/forgot-password/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions/account.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$account$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/account.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_4aac3583._.js.map