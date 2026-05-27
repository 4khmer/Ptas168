-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'manager', 'staff', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AuthVia" AS ENUM ('credentials', 'telegram');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'terminated');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('WATER', 'ELECTRICITY', 'FIXED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('progress', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoicePaymentMethod" AS ENUM ('Cash', 'QRTransfer');

-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('RENT', 'WATER', 'ELECTRICITY', 'FIXED_SERVICE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OVERDUE_INVOICE', 'PAYMENT_RECEIVED', 'TENANT_ADDED', 'GENERIC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "profileImage" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'manager',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "via" "AuthVia" NOT NULL DEFAULT 'credentials',
    "telegramId" BIGINT,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "pricePerMonth" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "baseRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "securityDeposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "terminationReason" TEXT,
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_fees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Box',
    "serviceType" "ServiceType" NOT NULL DEFAULT 'FIXED',
    "defaultRate" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'mo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_services" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "serviceFeeId" TEXT NOT NULL,
    "priceOverride" DECIMAL(12,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "recordDate" DATE NOT NULL,
    "recordedByName" TEXT NOT NULL,
    "previousReading" DECIMAL(12,3) NOT NULL,
    "currentReading" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT,
    "roomName" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL,
    "floorName" TEXT NOT NULL,
    "billPeriodStart" DATE NOT NULL,
    "billPeriodEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "billDays" INTEGER NOT NULL,
    "daysInMonth" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'progress',
    "baseRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "securityDeposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL(12,2) NOT NULL DEFAULT 4000,
    "khrAmount" DECIMAL(14,2),
    "paymentMethod" "InvoicePaymentMethod",
    "paidAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineItemType" "LineItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "previousReading" DECIMAL(12,3),
    "currentReading" DECIMAL(12,3),
    "unitPrice" DECIMAL(12,4),
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ref" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "floors_buildingId_idx" ON "floors"("buildingId");

-- CreateIndex
CREATE INDEX "rooms_floorId_idx" ON "rooms"("floorId");

-- CreateIndex
CREATE INDEX "rooms_buildingId_idx" ON "rooms"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_phone_key" ON "tenants"("phone");

-- CreateIndex
CREATE INDEX "contracts_roomId_idx" ON "contracts"("roomId");

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "room_services_roomId_idx" ON "room_services"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "room_services_roomId_serviceFeeId_key" ON "room_services"("roomId", "serviceFeeId");

-- CreateIndex
CREATE INDEX "meter_readings_roomId_serviceType_recordDate_idx" ON "meter_readings"("roomId", "serviceType", "recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_roomId_idx" ON "invoices"("roomId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_billPeriodStart_idx" ON "invoices"("billPeriodStart");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_services" ADD CONSTRAINT "room_services_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_services" ADD CONSTRAINT "room_services_serviceFeeId_fkey" FOREIGN KEY ("serviceFeeId") REFERENCES "service_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
