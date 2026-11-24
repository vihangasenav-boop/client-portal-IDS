// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import router from "next/router";

// export default function UserLoginPage() {
//   const searchParams = useSearchParams();
//   const [propertyCode, setPropertyCode] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [sessionMessage, setSessionMessage] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (searchParams?.get("sessionExpired")) {
//       setSessionMessage("Your session expired. Please log in again.");
//     }
//   }, [searchParams]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     try {
//       const res = await fetch("/api/auth/client-login", {
//         method: "POST",
//         credentials: "include",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ propertyCode, email, password }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         setError(data.error ?? "Login failed");
//         return;
//       }


//       if (data.user.allowedModules.length === 0) {
//         router.push("/admin/access-denied");
//         return;
//       }

//       router.push("/clientDashboard");
//     } catch {
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };


//   return (
//     <div className="min-h-screen flex items-center justify-center bg-white relative">
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-gray-50 opacity-80"></div>
//       </div>

//       <div className="z-10 w-full max-w-3xl px-6">
//         <div className="mx-auto max-w-lg rounded-2xl border-2 border-gray-300 bg-white/95 shadow-lg">
//           <div className="flex items-center justify-center p-8">
//             <div className="w-full">
//               <div className="text-center">
//                 <div className="mx-auto mb-4 inline-block rounded-full bg-orange-50 px-6 py-3">
//                   <span className="text-3xl font-extrabold text-orange-500">idsnext</span>
//                 </div>
//                 <p className="text-sm text-gray-600">FX Cloud Application Data Gathering</p>
//               </div>

//               <form onSubmit={handleSubmit} className="mt-6 space-y-4">
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-500">Property Code</label>
//                   <input
//                     type="text"
//                     placeholder="Property Code"
//                     value={propertyCode}
//                     onChange={(e) => setPropertyCode(e.target.value)}
//                     required
//                     className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:outline-none focus:border-orange-400"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-gray-500">Email</label>
//                   <input
//                     type="email"
//                     placeholder="client@example.com"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     required
//                     className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:outline-none focus:border-orange-400"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-gray-500">Password</label>
//                   <input
//                     type="password"
//                     placeholder="Password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                     className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:outline-none focus:border-orange-400"
//                   />
//                 </div>

//                 {sessionMessage && (
//                   <p className="text-yellow-600 text-sm">{sessionMessage}</p>
//                 )}
//                 {error && <p className="text-red-500 text-sm">{error}</p>}

//                 <div className="mt-4">
//                   <button
//                     type="submit"
//                     disabled={loading}
//                     className="w-full rounded bg-gray-400 px-4 py-2 text-sm font-semibold text-black shadow-sm disabled:opacity-60"
//                   >
//                     {loading ? "Logging in..." : "LOGIN"}
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ClientUser = {
  id: number;
  propertyId: number;
  name: string;
  email: string;
  role: string;
  allowedModules: string[];
};

type LoginResponse = {
  message?: string;
  user?: ClientUser;
  error?: string;
};

export default function UserLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [propertyCode, setPropertyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("sessionExpired")) {
      setSessionMessage("Your session expired. Please log in again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSessionMessage("");

    try {
      const res = await fetch("/api/auth/client-login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyCode: propertyCode.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse = await res.json();

      console.log("Client login response:", data);

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (!data.user) {
        setError("Login succeeded, but user information was not returned.");
        return;
      }

      const allowedModules = Array.isArray(data.user.allowedModules)
        ? data.user.allowedModules
        : [];

      console.log("Logged in user:", data.user);
      console.log("Allowed modules:", allowedModules);

      // No modules assigned
      if (allowedModules.length === 0) {
        router.push("/admin/access-denied");
        return;
      }

      // Login successful
      router.push("/clientDashboard");
    } catch (error) {
      console.error("Client login error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-white to-gray-50 opacity-80" />
      </div>

      {/* Login container */}
      <div className="z-10 w-full max-w-3xl px-6">
        <div className="mx-auto max-w-lg rounded-2xl border-2 border-gray-300 bg-white/95 shadow-lg">
          <div className="flex items-center justify-center p-8">
            <div className="w-full">

              {/* Header */}
              <div className="text-center">
                <div className="mx-auto mb-4 inline-block rounded-full bg-orange-50 px-6 py-3">
                  <span className="text-3xl font-extrabold text-orange-500">
                    idsnext
                  </span>
                </div>

                <p className="text-sm text-gray-600">
                  FX Cloud Application Data Gathering
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">

                {/* Property Code */}
                <div>
                  <label
                    htmlFor="propertyCode"
                    className="block text-xs font-semibold text-gray-500"
                  >
                    Property Code
                  </label>

                  <input
                    id="propertyCode"
                    type="text"
                    placeholder="Property Code"
                    value={propertyCode}
                    onChange={(e) => setPropertyCode(e.target.value)}
                    required
                    disabled={loading}
                    className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:border-orange-400 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-gray-500"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:border-orange-400 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-gray-500"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="mt-2 w-full border-b border-gray-300 py-2 text-base focus:border-orange-400 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                {/* Session message */}
                {sessionMessage && (
                  <p className="text-sm text-yellow-600">
                    {sessionMessage}
                  </p>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                  </div>
                )}

                {/* Login button */}
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Logging in..." : "LOGIN"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}