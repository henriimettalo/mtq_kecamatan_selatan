-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(80) NOT NULL,
    `settings` LONGTEXT NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL,
    `active_event_id` VARCHAR(80) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_settings_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` VARCHAR(80) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `actor` VARCHAR(150) NOT NULL,
    `before_settings` LONGTEXT NULL,
    `after_settings` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_settings_audit_event_id_id_idx`(`event_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nik` VARCHAR(16) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `nomor_whatsapp` VARCHAR(20) NOT NULL,
    `jenis_kelamin` VARCHAR(1) NOT NULL,
    `alamat` TEXT NOT NULL,
    `tempat_lahir` VARCHAR(150) NOT NULL,
    `tanggal_lahir` VARCHAR(10) NOT NULL,
    `asal_sekolah` VARCHAR(255) NULL,
    `no_rekening` VARCHAR(80) NULL,
    `nama_pemilik_rekening` VARCHAR(150) NULL,
    `cabang` VARCHAR(80) NOT NULL,
    `kk_filename` VARCHAR(255) NOT NULL,
    `ktp_filename` VARCHAR(255) NULL,
    `akta_filename` VARCHAR(255) NOT NULL,
    `surat_pernyataan_filename` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `rejection_reason` TEXT NULL,
    `token` VARCHAR(36) NULL,
    `google_sub` VARCHAR(255) NULL,
    `event_id` VARCHAR(80) NOT NULL,
    `branch_name` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `participants_event_id_status_created_at_idx`(`event_id`, `status`, `created_at`),
    INDEX `participants_google_sub_event_id_idx`(`google_sub`, `event_id`),
    INDEX `participants_nik_idx`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `participant_sessions` (
    `token_hash` VARCHAR(64) NOT NULL,
    `google_sub` VARCHAR(255) NOT NULL,
    `expires_at` INTEGER NOT NULL,

    INDEX `participant_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `key_prefix` VARCHAR(40) NOT NULL,
    `key_hash` VARCHAR(64) NOT NULL,
    `scopes` VARCHAR(255) NOT NULL,
    `created_by` VARCHAR(150) NOT NULL DEFAULT 'admin',
    `last_used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_keys_key_hash_key`(`key_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `participant_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participant_id` INTEGER NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `previous_status` VARCHAR(20) NOT NULL,
    `new_status` VARCHAR(20) NOT NULL,
    `rejection_reason` TEXT NULL,
    `actor` VARCHAR(150) NOT NULL,
    `actor_key_id` INTEGER NULL,
    `ip_address` VARCHAR(64) NOT NULL,
    `user_agent` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `participant_audit_logs_participant_id_id_idx`(`participant_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_active_event_id_fkey` FOREIGN KEY (`active_event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_settings_audit` ADD CONSTRAINT `event_settings_audit_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `participants` ADD CONSTRAINT `participants_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `participant_audit_logs` ADD CONSTRAINT `participant_audit_logs_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

