import { PrismaClient } from '@prisma/client'
// Removed: Prisma seed is no longer used after DynamoDB migration.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@luxride.com' },
    update: {},
    create: {
      email: 'admin@luxride.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  })

  // Create sample vehicles
  const sedanVehicle = await prisma.vehicle.upsert({
    where: { licensePlate: 'LUX001' },
    update: {},
    create: {
      make: 'Mercedes-Benz',
      model: 'S-Class',
      year: 2023,
      color: 'Black',
      licensePlate: 'LUX001',
      type: 'LUXURY',
      capacity: 4,
      pricePerMile: 3.50,
      pricePerHour: 75.00,
      features: ['Leather Seats', 'Climate Control', 'WiFi', 'Champagne Service'],
      images: ['/vehicles/mercedes-s-class.jpg'],
    },
  })

  const suvVehicle = await prisma.vehicle.upsert({
    where: { licensePlate: 'LUX002' },
    update: {},
    create: {
      make: 'Cadillac',
      model: 'Escalade',
      year: 2023,
      color: 'White',
      licensePlate: 'LUX002',
      type: 'SUV',
      capacity: 7,
      pricePerMile: 4.00,
      pricePerHour: 90.00,
      features: ['Premium Audio', 'Captain Chairs', 'Panoramic Roof', 'Bar Setup'],
      images: ['/vehicles/cadillac-escalade.jpg'],
    },
  })

  // Create sample driver
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@luxride.com' },
    update: {},
    create: {
      email: 'driver@luxride.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: 'DRIVER',
    },
  })

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: 'DL123456789',
      vehicleId: sedanVehicle.id,
      status: 'AVAILABLE',
      rating: 4.8,
      totalTrips: 150,
      totalEarnings: 12500.00,
      isVerified: true,
    },
  })

  // Create app settings
  const settings = [
    { key: 'base_fare', value: '5.00', description: 'Base fare for all trips' },
    { key: 'price_per_mile', value: '2.50', description: 'Default price per mile' },
    { key: 'price_per_minute', value: '0.50', description: 'Default price per minute' },
    { key: 'surge_multiplier', value: '1.0', description: 'Current surge pricing multiplier' },
    { key: 'max_booking_advance_days', value: '30', description: 'Maximum days in advance for booking' },
  ]

  for (const setting of settings) {
    await prisma.appSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }

  console.log('✅ Seeding completed successfully!')
  console.log(`👤 Admin User: ${adminUser.email}`)
  console.log(`🚗 Vehicles created: ${sedanVehicle.make} ${sedanVehicle.model}, ${suvVehicle.make} ${suvVehicle.model}`)
  console.log(`👨‍💼 Driver: ${driverUser.firstName} ${driverUser.lastName}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })