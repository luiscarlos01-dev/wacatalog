export type AdminStoreAccessFixture = {
  adminEmail: string | undefined;
  adminPassword: string | undefined;
  secondAdminEmail: string | undefined;
  secondAdminPassword: string | undefined;
  unaffiliatedAdminEmail: string | undefined;
  unaffiliatedAdminPassword: string | undefined;
};

function hasConfiguredCredentials(email: string | undefined, password: string | undefined) {
  return Boolean(email?.includes("@") && password?.trim().length);
}

export function hasConfiguredAdminStoreAccess(
  fixture: AdminStoreAccessFixture,
): fixture is AdminStoreAccessFixture & {
  adminEmail: string;
  adminPassword: string;
} {
  return hasConfiguredCredentials(fixture.adminEmail, fixture.adminPassword);
}

export function hasConfiguredSecondAdminStoreAccess(
  fixture: AdminStoreAccessFixture,
): fixture is AdminStoreAccessFixture & {
  secondAdminEmail: string;
  secondAdminPassword: string;
} {
  return hasConfiguredCredentials(fixture.secondAdminEmail, fixture.secondAdminPassword);
}

export function hasConfiguredUnaffiliatedAdminAccess(
  fixture: AdminStoreAccessFixture,
): fixture is AdminStoreAccessFixture & {
  unaffiliatedAdminEmail: string;
  unaffiliatedAdminPassword: string;
} {
  return hasConfiguredCredentials(
    fixture.unaffiliatedAdminEmail,
    fixture.unaffiliatedAdminPassword,
  );
}

export function getAdminStoreAccessFixture(): AdminStoreAccessFixture {
  return {
    adminEmail: process.env.E2E_ADMIN_EMAIL,
    adminPassword: process.env.E2E_ADMIN_PASSWORD,
    secondAdminEmail: process.env.E2E_SECOND_ADMIN_EMAIL,
    secondAdminPassword: process.env.E2E_SECOND_ADMIN_PASSWORD,
    unaffiliatedAdminEmail: process.env.E2E_UNAFFILIATED_ADMIN_EMAIL,
    unaffiliatedAdminPassword: process.env.E2E_UNAFFILIATED_ADMIN_PASSWORD,
  };
}
