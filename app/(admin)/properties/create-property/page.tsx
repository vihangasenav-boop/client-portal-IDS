"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "../../components/layout/Topbar";
import {
  Building2,
  Hash,
  MapPin,
  Mail,
  Plus,
  Trash2,
  ArrowLeft,
  Layers,
  UserRound,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

type FormUser = {
  name: string;
  email: string;
  password: string;
};

type Module = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};


export default function AddPropertyPage() {

  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await fetch("/api/admin-api/module");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load modules");
        }

        setModulesList(data.modules);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load modules"
        );
      }
    };

    loadModules();
  }, []);


  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [users, setUsers] = useState<FormUser[]>([{ name: "", email: "", password: "" }]);
  const [modulesList, setModulesList] = useState<Module[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  const handleUserChange = (index: number, field: keyof FormUser, value: string) => {
    const updated = [...users];
    updated[index][field] = value;
    setUsers(updated);
  };

  const addUser = () => {
    setUsers([...users, { name: "", email: "", password: "" }]);
  };

  const removeUser = (index: number) => {
    setUsers(users.filter((_, itemIndex) => itemIndex !== index));
  };



  const togglePasswordVisibility = (index: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleModule = (code: string) => {
    setModules((prev) =>
      prev.includes(code)
        ? prev.filter((m) => m !== code)
        : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const cleanedUsers = users.filter((user) => user.name.trim() || user.email.trim() || user.password.trim());

      if (cleanedUsers.some((user) => !user.name.trim() || !user.email.trim() || !user.password.trim())) {
        throw new Error("Each user must include a name, email and password.");
      }

      const response = await fetch("/api/admin-api/add-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          address,
          modules,
          users: cleanedUsers.map((user) => ({ ...user, role: "CLIENT" })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save property");
      }

      router.replace("/properties");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save property");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Properties — Add New Property"
        action={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto bg-gray-100 px-6 py-5">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">New Property</h1>
              <p className="text-xs text-gray-400">Fill in the details to register a new property</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field icon={<Hash size={14} />} label="Property Code">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                  placeholder="e.g. PR-004"
                  required
                />
              </Field>

              <Field icon={<Building2 size={14} />} label="Property Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                  placeholder="e.g. Sunset Residency"
                  required
                />
              </Field>
            </div>

            <Field icon={<MapPin size={14} />} label="Address">
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                placeholder="Full property address"
              />
            </Field>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-orange-500" />
                  <span className="text-xs font-medium text-gray-700">Property Users</span>
                  <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-xs text-orange-600">
                    {users.filter((user) => user.name.trim() || user.email.trim() || user.password.trim()).length} added
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addUser}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-100"
                >
                  <Plus size={11} />
                  Add User
                </button>
              </div>

              <div className="space-y-3">
                {users.map((user, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        User {index + 1}
                      </span>
                      {users.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUser(index)}
                          className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Field icon={<UserRound size={14} />} label="Name">
                        <input
                          type="text"
                          value={user.name}
                          onChange={(e) => handleUserChange(index, "name", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                          placeholder="User full name"
                          required
                        />
                      </Field>
                      <Field icon={<Mail size={14} />} label="Email">
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => handleUserChange(index, "email", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                          placeholder="user@example.com"
                          required
                        />
                      </Field>
                      <Field icon={<KeyRound size={14} />} label="Password">
                        <div className="relative">
                          <input
                            type={visiblePasswords[index] ? "text" : "password"}
                            value={user.password}
                            onChange={(e) => handleUserChange(index, "password", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-9 text-xs transition-all placeholder:text-gray-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                            placeholder="Temporary password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(index)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-orange-500"
                            aria-label={visiblePasswords[index] ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layers size={14} className="text-orange-500" />
                <span className="text-xs font-medium text-gray-700">Module Access</span>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-xs text-orange-600">
                  {modules.length} selected
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {modulesList.map((module) => {
                  const active = modules.includes(module.code);

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.code)}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${active
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                        }`}
                    >
                      <div
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${active
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                          }`}
                      >
                        {active && (
                          <svg
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                          >
                            <path
                              d="M1 3L3 5L7 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      <div>
                        <p
                          className={`text-xs font-semibold ${active ? "text-orange-700" : "text-gray-700"
                            }`}
                        >
                          {module.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400">
                          {module.description || "No description"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pb-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-medium text-white transition-colors ${isSaving ? "cursor-not-allowed bg-orange-300" : "bg-orange-500 hover:bg-orange-600"}`}
              >
                <Building2 size={13} />
                {isSaving ? "Saving…" : "Save Property"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-orange-500">{icon}</span>
        <label className="text-xs font-medium text-gray-700">{label}</label>
      </div>
      {children}
    </div>
  );
}