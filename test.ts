import bcrypt from "bcryptjs";

async function main() {
  const password = "client123";

  const hash =
    "$2b$12$fkL2tX/f77hIAFram3/1N.DQ0.jjS5fMbUAgFnSf9TZyppwERSEu6";

  const result = await bcrypt.compare(password, hash);

  console.log("Password matches:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});