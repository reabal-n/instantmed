module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/lib/stripe/client.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDisplayPriceForCategory",
    ()=>getDisplayPriceForCategory,
    "getPriceIdForRequest",
    ()=>getPriceIdForRequest,
    "stripe",
    ()=>stripe
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$stripe$2f$esm$2f$stripe$2e$esm$2e$node$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/stripe/esm/stripe.esm.node.js [app-rsc] (ecmascript)");
;
;
// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
const stripe = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$stripe$2f$esm$2f$stripe$2e$esm$2e$node$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"](process.env.STRIPE_SECRET_KEY);
function getPriceIdForRequest({ category, subtype, answers }) {
    // Medical certificates - all use the same price
    if (category === "medical_certificate") {
        const priceId = process.env.STRIPE_PRICE_MEDCERT;
        if (!priceId) {
            throw new Error("Missing STRIPE_PRICE_MEDCERT environment variable");
        }
        return priceId;
    }
    // Prescriptions - all use the same price
    if (category === "prescription") {
        const priceId = process.env.STRIPE_PRICE_PRESCRIPTION;
        if (!priceId) {
            throw new Error("Missing STRIPE_PRICE_PRESCRIPTION environment variable");
        }
        return priceId;
    }
    // Referrals - different pricing for imaging vs bloods
    if (category === "referral") {
        // Check if it's pathology-imaging subtype
        if (subtype === "pathology-imaging" || subtype === "pathology_imaging") {
            // Check if any imaging tests are selected
            const selectedTests = answers?.test_types;
            const imagingTests = [
                "xray",
                "ultrasound",
                "ct_mri"
            ];
            const hasImaging = selectedTests?.some((test)=>imagingTests.includes(test));
            if (hasImaging) {
                const priceId = process.env.STRIPE_PRICE_IMAGING;
                if (!priceId) {
                    throw new Error("Missing STRIPE_PRICE_IMAGING environment variable");
                }
                return priceId;
            } else {
                const priceId = process.env.STRIPE_PRICE_PATHOLOGY_BLOODS;
                if (!priceId) {
                    throw new Error("Missing STRIPE_PRICE_PATHOLOGY_BLOODS environment variable");
                }
                return priceId;
            }
        }
        // Specialist referrals - use bloods price as default
        const priceId = process.env.STRIPE_PRICE_PATHOLOGY_BLOODS;
        if (!priceId) {
            throw new Error("Missing STRIPE_PRICE_PATHOLOGY_BLOODS environment variable for specialist referrals");
        }
        return priceId;
    }
    throw new Error(`Unknown category: ${category}`);
}
function getDisplayPriceForCategory(category) {
    switch(category){
        case "medical_certificate":
            return "$19.95";
        case "prescription":
            return "$24.95";
        case "referral":
            return "$29.95";
        default:
            return "$19.95";
    }
}
}),
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
"[project]/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkOnboardingRequired",
    ()=>checkOnboardingRequired,
    "getAuthenticatedUserWithProfile",
    ()=>getAuthenticatedUserWithProfile,
    "getCurrentUser",
    ()=>getCurrentUser,
    "getOptionalAuth",
    ()=>getOptionalAuth,
    "getUserProfile",
    ()=>getUserProfile,
    "requireAuth",
    ()=>requireAuth,
    "requirePatientAuth",
    ()=>requirePatientAuth,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
;
;
async function getAuthenticatedUserWithProfile() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return null;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single();
    if (profileError || !profile) {
        return null;
    }
    return {
        user,
        profile: profile
    };
}
async function requireAuth(requiredRole, options) {
    const authUser = await getAuthenticatedUserWithProfile();
    if (!authUser) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/auth/login");
    }
    if (authUser.profile.role !== requiredRole) {
        // Redirect to the correct dashboard based on role
        if (authUser.profile.role === "patient") {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/patient");
        } else if (authUser.profile.role === "doctor") {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/doctor");
        } else {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/auth/login");
        }
    }
    // Check onboarding for patients (unless explicitly allowed)
    if (requiredRole === "patient" && !options?.allowIncompleteOnboarding && !authUser.profile.onboarding_completed) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/patient/onboarding");
    }
    return authUser;
}
async function signOut() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    await supabase.auth.signOut();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/");
}
async function getOptionalAuth() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return null;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single();
    if (profileError || !profile) {
        return null;
    }
    return {
        user,
        profile: profile
    };
}
async function getCurrentUser() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}
async function getUserProfile(authUserId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).single();
    if (error || !profile) return null;
    return profile;
}
async function checkOnboardingRequired(authUser) {
    return authUser.profile.role === "patient" && !authUser.profile.onboarding_completed;
}
async function requirePatientAuth(options) {
    return requireAuth("patient", options);
}
}),
"[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"401a12b18a53110d49d6bfa58fb8595aac90eaf7b4":"createRequestAndCheckoutAction","40c0c23e1de2bd6a5f557d87383f53ac96df1be4c3":"retryPaymentForRequestAction"},"",""] */ __turbopack_context__.s([
    "createRequestAndCheckoutAction",
    ()=>createRequestAndCheckoutAction,
    "retryPaymentForRequestAction",
    ()=>retryPaymentForRequestAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/stripe/client.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
function getBaseUrl() {
    // Try NEXT_PUBLIC_SITE_URL first
    let baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000");
    // Fallback to VERCEL_URL for Vercel deployments
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Final fallback to localhost
    if (!baseUrl) {
        baseUrl = "http://localhost:3000";
    }
    // Ensure URL doesn't have trailing slash
    return baseUrl.replace(/\/$/, "");
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch  {
        return false;
    }
}
async function createRequestAndCheckoutAction(input) {
    try {
        // 1. Get authenticated user
        const authUser = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAuthenticatedUserWithProfile"])();
        if (!authUser) {
            return {
                success: false,
                error: "You must be logged in to submit a request"
            };
        }
        const patientId = authUser.profile.id;
        const patientEmail = authUser.user.email;
        // 2. Get the Supabase client
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
        const baseUrl = getBaseUrl();
        if (!isValidUrl(baseUrl)) {
            console.error("Invalid base URL configuration:", baseUrl);
            return {
                success: false,
                error: "Server configuration error. Please contact support."
            };
        }
        // 3. Create the request with pending_payment status
        const { data: request, error: requestError } = await supabase.from("requests").insert({
            patient_id: patientId,
            type: input.type,
            status: "pending",
            category: input.category,
            subtype: input.subtype,
            paid: false,
            payment_status: "pending_payment"
        }).select().single();
        if (requestError || !request) {
            console.error("Error creating request:", requestError);
            if (requestError?.code === "23503") {
                return {
                    success: false,
                    error: "Your profile could not be found. Please sign out and sign in again."
                };
            }
            if (requestError?.code === "42501") {
                return {
                    success: false,
                    error: "You don't have permission to create requests. Please contact support."
                };
            }
            return {
                success: false,
                error: "Failed to create your request. Please try again."
            };
        }
        // 4. Insert the answers
        const { error: answersError } = await supabase.from("request_answers").insert({
            request_id: request.id,
            answers: input.answers
        });
        if (answersError) {
            console.error("Error creating answers:", answersError);
        // Don't fail the whole request, answers are supplementary
        }
        // 5. Get the price ID
        const priceId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPriceIdForRequest"])({
            category: input.category,
            subtype: input.subtype,
            answers: input.answers
        });
        if (!priceId) {
            console.error("No price ID found for:", input.category, input.subtype);
            // Clean up the created request
            await supabase.from("requests").delete().eq("id", request.id);
            return {
                success: false,
                error: "Unable to determine pricing. Please contact support."
            };
        }
        // 6. Build success and cancel URLs with validation
        const successUrl = `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`;
        // 7. Build checkout session params
        const sessionParams = {
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: "payment",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                request_id: request.id,
                patient_id: patientId,
                category: input.category,
                subtype: input.subtype
            }
        };
        if (authUser.profile.stripe_customer_id) {
            sessionParams.customer = authUser.profile.stripe_customer_id;
        } else {
            sessionParams.customer_email = patientEmail || undefined;
            sessionParams.customer_creation = "always"; // Always create a customer for new users
        }
        // 8. Create Stripe checkout session
        let session;
        try {
            session = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stripe"].checkout.sessions.create(sessionParams);
        } catch (stripeError) {
            console.error("Stripe error:", stripeError);
            await supabase.from("requests").delete().eq("id", request.id);
            if (stripeError instanceof Error) {
                if (stripeError.message.includes("Invalid URL")) {
                    return {
                        success: false,
                        error: "Server configuration error. Please contact support."
                    };
                }
                if (stripeError.message.includes("No such price")) {
                    return {
                        success: false,
                        error: "This service is temporarily unavailable. Please try again later."
                    };
                }
            }
            return {
                success: false,
                error: "Payment system error. Please try again."
            };
        }
        if (!session.url) {
            // Clean up
            await supabase.from("requests").delete().eq("id", request.id);
            return {
                success: false,
                error: "Failed to create checkout session. Please try again."
            };
        }
        // 9. Create payment record
        const { error: paymentError } = await supabase.from("payments").insert({
            request_id: request.id,
            stripe_session_id: session.id,
            amount: session.amount_total || 0,
            currency: session.currency || "aud",
            status: "created"
        });
        if (paymentError) {
            console.error("Error creating payment record:", paymentError);
        // Don't fail - the payment record is for tracking, Stripe is the source of truth
        }
        return {
            success: true,
            checkoutUrl: session.url
        };
    } catch (error) {
        console.error("Error in createRequestAndCheckoutAction:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again or contact support if the problem persists."
        };
    }
}
async function retryPaymentForRequestAction(requestId) {
    try {
        // 1. Get authenticated user
        const authUser = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAuthenticatedUserWithProfile"])();
        if (!authUser) {
            return {
                success: false,
                error: "You must be logged in"
            };
        }
        const patientId = authUser.profile.id;
        const patientEmail = authUser.user.email;
        // 2. Get the Supabase client
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
        // 3. Fetch the existing request with ownership check
        const { data: request, error: requestError } = await supabase.from("requests").select("*").eq("id", requestId).eq("patient_id", patientId).single();
        if (requestError || !request) {
            console.error("Error fetching request for retry:", requestError);
            return {
                success: false,
                error: "Request not found"
            };
        }
        // 4. Verify the request is in pending_payment status
        if (request.payment_status !== "pending_payment") {
            return {
                success: false,
                error: "This request has already been paid or is not awaiting payment"
            };
        }
        // 5. Get the price ID using existing request data
        const priceId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPriceIdForRequest"])({
            category: request.category,
            subtype: request.subtype || "",
            answers: {}
        });
        // 6. Get base URL for redirects
        const baseUrl = getBaseUrl();
        if (!isValidUrl(baseUrl)) {
            console.error("Invalid base URL configuration:", baseUrl);
            return {
                success: false,
                error: "Server configuration error. Please contact support."
            };
        }
        // 7. Build checkout session params
        const sessionParams = {
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: "payment",
            success_url: `${baseUrl}/patient/requests/success?request_id=${request.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/patient/requests/cancelled?request_id=${request.id}`,
            metadata: {
                request_id: request.id,
                patient_id: patientId,
                category: request.category || "",
                subtype: request.subtype || "",
                is_retry: "true"
            }
        };
        if (authUser.profile.stripe_customer_id) {
            sessionParams.customer = authUser.profile.stripe_customer_id;
        } else {
            sessionParams.customer_email = patientEmail || undefined;
            sessionParams.customer_creation = "always";
        }
        // 8. Create new Stripe checkout session for retry
        let session;
        try {
            session = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stripe"].checkout.sessions.create(sessionParams);
        } catch (stripeError) {
            console.error("Stripe error:", stripeError);
            await supabase.from("requests").delete().eq("id", request.id);
            if (stripeError instanceof Error) {
                if (stripeError.message.includes("Invalid URL")) {
                    return {
                        success: false,
                        error: "Server configuration error. Please contact support."
                    };
                }
                if (stripeError.message.includes("No such price")) {
                    return {
                        success: false,
                        error: "This service is temporarily unavailable. Please try again later."
                    };
                }
            }
            return {
                success: false,
                error: "Payment system error. Please try again."
            };
        }
        if (!session.url) {
            // Clean up
            await supabase.from("requests").delete().eq("id", request.id);
            return {
                success: false,
                error: "Failed to create checkout session. Please try again."
            };
        }
        // 9. Update or insert payment record for this new session
        const { error: paymentError } = await supabase.from("payments").upsert({
            request_id: request.id,
            stripe_session_id: session.id,
            amount: session.amount_total || 0,
            currency: session.currency || "aud",
            status: "created"
        }, {
            onConflict: "request_id"
        });
        if (paymentError) {
            console.error("Error updating payment record:", paymentError);
        // Don't fail - the payment record is for tracking, Stripe is the source of truth
        }
        return {
            success: true,
            checkoutUrl: session.url
        };
    } catch (error) {
        console.error("Error in retryPaymentForRequestAction:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again or contact support if the problem persists."
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createRequestAndCheckoutAction,
    retryPaymentForRequestAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createRequestAndCheckoutAction, "401a12b18a53110d49d6bfa58fb8595aac90eaf7b4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(retryPaymentForRequestAction, "40c0c23e1de2bd6a5f557d87383f53ac96df1be4c3", null);
}),
"[project]/lib/supabase/service-role.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createServiceRoleClient",
    ()=>createServiceRoleClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-rsc] (ecmascript)");
;
function createServiceRoleClient() {
    const supabaseUrl = ("TURBOPACK compile-time value", "https://witzcrovsoumktyndqgz.supabase.co");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
}),
"[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"70777e9dffada85dde3d0effd1f4fd3572ca32c38b":"createOrGetProfile"},"",""] */ __turbopack_context__.s([
    "createOrGetProfile",
    ()=>createOrGetProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$service$2d$role$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/service-role.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function createOrGetProfile(authUserId, fullName, dateOfBirth) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$service$2d$role$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceRoleClient"])();
    try {
        // First verify the user exists in auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
        if (authError || !authUser?.user) {
            return {
                profileId: null,
                error: "User not found. Please confirm your email first."
            };
        }
        // Check if profile already exists
        const { data: existingProfile } = await supabase.from("profiles").select("id").eq("auth_user_id", authUserId).single();
        if (existingProfile) {
            // Update with the provided info if we have it
            if (fullName || dateOfBirth) {
                await supabase.from("profiles").update({
                    ...fullName && {
                        full_name: fullName
                    },
                    ...dateOfBirth && {
                        date_of_birth: dateOfBirth
                    }
                }).eq("id", existingProfile.id);
            }
            return {
                profileId: existingProfile.id,
                error: null
            };
        }
        // Create new profile - user is verified to exist
        const { data: newProfile, error: insertError } = await supabase.from("profiles").insert({
            auth_user_id: authUserId,
            full_name: fullName || "User",
            date_of_birth: dateOfBirth || null,
            role: "patient",
            onboarding_completed: false
        }).select("id").single();
        if (insertError) {
            console.error("Profile insert error:", insertError);
            return {
                profileId: null,
                error: insertError.message
            };
        }
        return {
            profileId: newProfile.id,
            error: null
        };
    } catch (err) {
        console.error("createOrGetProfile error:", err);
        return {
            profileId: null,
            error: err instanceof Error ? err.message : "Failed to create profile"
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createOrGetProfile
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createOrGetProfile, "70777e9dffada85dde3d0effd1f4fd3572ca32c38b", null);
}),
"[project]/.next-internal/server/app/medical-certificate/request/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$create$2d$profile$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/.next-internal/server/app/medical-certificate/request/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "401a12b18a53110d49d6bfa58fb8595aac90eaf7b4",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createRequestAndCheckoutAction"],
    "70777e9dffada85dde3d0effd1f4fd3572ca32c38b",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$create$2d$profile$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createOrGetProfile"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$medical$2d$certificate$2f$request$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$lib$2f$stripe$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$create$2d$profile$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/medical-certificate/request/page/actions.js { ACTIONS_MODULE0 => "[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$stripe$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/stripe/checkout.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$create$2d$profile$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/create-profile.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__08ab18b1._.js.map