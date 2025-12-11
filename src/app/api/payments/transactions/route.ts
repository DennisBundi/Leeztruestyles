import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole, getEmployee } from '@/lib/auth/roles';
import { formatOrderId } from '@/lib/utils/orderId';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const userRole = await getUserRole(user.id);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get employee record for sellers
    let employeeId: string | null = null;
    if (userRole === 'seller') {
      const employee = await getEmployee(user.id);
      if (!employee) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 403 });
      }
      employeeId = employee.id;
    }

    // Fetch transactions from transactions table
    // For sellers, we need to filter by their orders
    let transactionsQuery = supabase
      .from('transactions')
      .select('*, orders(id, payment_method, payment_reference, seller_id)')
      .order('created_at', { ascending: false });
    
    // If seller, we'll filter after fetching (since we need to join with orders)
    const { data: transactions, error: transactionsError } = await transactionsQuery;
    
    // Filter transactions for sellers
    let filteredTransactions = transactions;
    if (userRole === 'seller' && employeeId && transactions) {
      filteredTransactions = transactions.filter((t: any) => {
        const order = Array.isArray(t.orders) ? t.orders[0] : t.orders;
        return order?.seller_id === employeeId;
      });
    }

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: transactionsError.message },
        { status: 500 }
      );
    }

    // Fetch orders that have payment info but might not have transaction records
    // (especially POS sales with cash/mpesa)
    let ordersQuery = supabase
      .from('orders')
      .select('id, payment_method, payment_reference, total_amount, status, created_at')
      .not('payment_method', 'is', null);
    
    // Sellers only see their own orders
    if (userRole === 'seller' && employeeId) {
      ordersQuery = ordersQuery.eq('seller_id', employeeId);
    }
    
    const { data: ordersWithPayment, error: ordersError } = await ordersQuery
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Combine transactions and orders into a unified list
    const transactionMap = new Map();
    
    // Process transactions from transactions table
    if (filteredTransactions) {
      for (const transaction of filteredTransactions) {
        // Handle orders relation - it can be an object or array depending on query
        const order = Array.isArray(transaction.orders) 
          ? transaction.orders[0] 
          : transaction.orders;
        const orderId = transaction.order_id;
        
        transactionMap.set(orderId, {
          id: transaction.id,
          reference: transaction.provider_reference || transaction.id.slice(0, 8).toUpperCase(),
          order_id: orderId,
          order_number: formatOrderId(orderId),
          amount: Number(transaction.amount) || 0,
          method: order?.payment_method || 'card', // Default to card for Paystack transactions
          status: transaction.status === 'success' ? 'success' : 
                  transaction.status === 'failed' ? 'failed' : 'pending',
          date: transaction.created_at,
          created_at: transaction.created_at,
        });
      }
    }

    // Process orders that don't have transaction records (POS sales)
    if (ordersWithPayment) {
      for (const order of ordersWithPayment) {
        // Only add if not already in map (to avoid duplicates)
        if (!transactionMap.has(order.id)) {
          // Determine status based on order status
          let transactionStatus = 'pending';
          if (order.status === 'completed') {
            transactionStatus = 'success';
          } else if (order.status === 'cancelled' || order.status === 'refunded') {
            transactionStatus = 'failed';
          }

          // Generate reference based on payment method
          let reference = order.payment_reference;
          if (!reference) {
            if (order.payment_method === 'cash') {
              reference = `CASH-${order.id.slice(0, 6).toUpperCase()}`;
            } else if (order.payment_method === 'mpesa') {
              reference = `MPESA-${order.id.slice(0, 6).toUpperCase()}`;
            } else {
              reference = `CARD-${order.id.slice(0, 6).toUpperCase()}`;
            }
          }

          transactionMap.set(order.id, {
            id: order.id,
            reference: reference,
            order_id: order.id,
            order_number: formatOrderId(order.id),
            amount: Number(order.total_amount) || 0,
            method: order.payment_method || 'cash',
            status: transactionStatus,
            date: order.created_at,
            created_at: order.created_at,
          });
        }
      }
    }

    // Convert map to array and sort by date (most recent first)
    const allTransactions = Array.from(transactionMap.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ transactions: allTransactions });
  } catch (error: any) {
    console.error('Payments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

