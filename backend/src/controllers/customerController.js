const prisma = require('../prismaClient');

// @desc    Create a new customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  try {
    const { companyName, customerCode, contactPerson, email, phone, address } = req.body;

    // Basic validation
    if (!companyName || !customerCode) {
      return res.status(400).json({ error: 'Company Name and Customer Code are required' });
    }

    // Insert into database
    const newCustomer = await prisma.customer.create({
      data: {
        companyName,
        customerCode,
        contactPerson,
        email,
        phone,
        address
      },
    });

    res.status(201).json(newCustomer);
  } catch (error) {
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

// @desc    Update a customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, customerCode, contactPerson, email, phone, address } = req.body;

    if (!companyName || !customerCode) {
      return res.status(400).json({ error: 'Company Name and Customer Code are required' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        companyName,
        customerCode,
        contactPerson,
        email,
        phone,
        address
      },
    });

    res.status(200).json(updatedCustomer);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Customer Code or Company Name already exists' });
    }
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.customer.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer. They may be linked to existing records.' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer
};