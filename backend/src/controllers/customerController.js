const prisma = require('../prismaClient');

// @desc    Create a new customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  try {
    const { companyName, customerCode } = req.body;

    // Basic validation
    if (!companyName || !customerCode) {
      return res.status(400).json({ error: 'Company Name and Customer Code are required' });
    }

    // Insert into database
    const newCustomer = await prisma.customer.create({
      data: {
        companyName,
        customerCode,
      },
    });

    res.status(201).json(newCustomer);
  } catch (error) {
    // Handle unique constraint violations (e.g., duplicate customer code)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Customer Code or Company Name already exists' });
    }
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get all customers
// @route   GET /api/customers
const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { companyName: 'asc' }, // Sort alphabetically
    });
    res.status(200).json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
};