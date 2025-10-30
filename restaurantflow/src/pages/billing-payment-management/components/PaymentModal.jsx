import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  paymentData, 
  onPaymentComplete 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    if (isOpen && paymentData) {
      // Set payment method based on what was passed from parent, or default to cash
      setPaymentMethod(paymentData?.method || 'cash');
      setCashReceived('');
      setCardDetails({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: ''
      });
      setUpiId('');
      
      setPaymentStatus(null);
    }
  }, [isOpen, paymentData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  // Compute net amount due. Prefer a fully computed amount from the passed table object
  // (subtotal +/- discount + tax + tip) when available. Fall back to paymentData.amount.
  const getAmountDue = () => {
    try {
      const tbl = paymentData?.table;
      if (tbl && Array.isArray(tbl.items) && tbl.items.length > 0) {
        const subtotal = (tbl.items || []).reduce((s, item) => s + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
        const discount = Number(tbl.discount || 0) || 0; // support a discount field if present
        const tip = Number(tbl.tip || tbl.tipAmount || 0) || 0; // support tip stored on table
        const taxRate = typeof tbl.taxRate === 'number' ? tbl.taxRate : 0.08; // default 8%
        const taxable = Math.max(0, subtotal - discount);
        const tax = taxable * taxRate;
        // Round to 2 decimals
        return Math.round((taxable + tax + tip) * 100) / 100;
      }
    } catch (e) {
      // ignore and fallback below
    }
    return Number(paymentData?.amount || 0);
  };

  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0;
    const amount = getAmountDue();
    return Math.max(0, received - amount);
  };

  const handleCashPayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStatus('success');
      setIsProcessing(false);
      
      const paymentResult = {
        method: 'cash',
        amount: getAmountDue(),
        cashReceived: parseFloat(cashReceived),
        change: calculateChange(),
        timestamp: new Date(),
        reference: 'CASH-' + Math.random()?.toString(36)?.substr(2, 9)?.toUpperCase()
      };
      
      setTimeout(() => {
        onPaymentComplete(paymentResult);
        onClose();
      }, 1500);
    }, 2000);
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    
    // Simulate card processing
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        setPaymentStatus('success');
        const paymentResult = {
          method: 'card',
          amount: getAmountDue(),
          cardLast4: cardDetails?.cardNumber?.slice(-4),
          timestamp: new Date(),
          reference: 'CARD-' + Math.random()?.toString(36)?.substr(2, 9)?.toUpperCase()
        };
        
        setTimeout(() => {
          onPaymentComplete(paymentResult);
          onClose();
        }, 1500);
      } else {
        setPaymentStatus('failed');
      }
      
      setIsProcessing(false);
    }, 3000);
  };

  const handleUpiPayment = async () => {
    setIsProcessing(true);
    
    // Simulate UPI processing
    setTimeout(() => {
      const success = Math.random() > 0.05; // 95% success rate
      
      if (success) {
        setPaymentStatus('success');
        const paymentResult = {
          method: 'upi',
          amount: getAmountDue(),
          upiId: upiId,
          timestamp: new Date(),
          reference: 'UPI-' + Math.random()?.toString(36)?.substr(2, 9)?.toUpperCase()
        };
        
        setTimeout(() => {
          onPaymentComplete(paymentResult);
          onClose();
        }, 1500);
      } else {
        setPaymentStatus('failed');
      }
      
      setIsProcessing(false);
    }, 3000);
  };



  if (!isOpen || !paymentData) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-subtle" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-modal w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Process Payment</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Table {paymentData?.tableNumber} • {formatCurrency(getAmountDue())}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Payment Status */}
        {paymentStatus && (
          <div className={`p-4 border-b border-border ${
            paymentStatus === 'success' ? 'bg-success/10' : 'bg-error/10'
          }`}>
            <div className="flex items-center space-x-3">
              <Icon 
                name={paymentStatus === 'success' ? 'CheckCircle' : 'XCircle'} 
                size={20} 
                className={paymentStatus === 'success' ? 'text-success' : 'text-error'} 
              />
              <div>
                <div className={`font-medium ${
                  paymentStatus === 'success' ? 'text-success' : 'text-error'
                }`}>
                  {paymentStatus === 'success' ? 'Payment Successful' : 'Payment Failed'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {paymentStatus === 'success' ?'Transaction completed successfully' :'Please try again or use a different payment method'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        {!paymentData?.method && (
          <div className="p-6 border-b border-border">
            <h3 className="font-medium text-foreground mb-4">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cash' ?'border-primary bg-primary/10' :'border-border hover:border-primary/30'
                }`}
              >
                <Icon name="Banknote" size={24} className="mx-auto mb-2" />
                <div className="text-sm font-medium">Cash</div>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card' ?'border-primary bg-primary/10' :'border-border hover:border-primary/30'
                }`}
              >
                <Icon name="CreditCard" size={24} className="mx-auto mb-2" />
                <div className="text-sm font-medium">Card</div>
              </button>
              <button
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'upi' ?'border-primary bg-primary/10' :'border-border hover:border-primary/30'
                }`}
              >
                <Icon name="Smartphone" size={24} className="mx-auto mb-2" />
                <div className="text-sm font-medium">UPI</div>
              </button>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="p-6">
          {/* Cash Payment */}
          {(paymentMethod === 'cash' || paymentData?.method === 'cash') && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Cash Payment</h3>
              
              <div className="bg-muted/20 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">Amount Due:</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(getAmountDue())}
                  </span>
                </div>
                
                <Input
                  label="Cash Received"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e?.target?.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="mb-4"
                />
                
                {cashReceived && parseFloat(cashReceived) >= getAmountDue() && (
                  <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                    <span className="text-sm font-medium text-success">Change Due:</span>
                    <span className="text-lg font-semibold text-success">
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="success"
                fullWidth
                onClick={handleCashPayment}
                disabled={!cashReceived || parseFloat(cashReceived) < getAmountDue() || isProcessing}
                loading={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Complete Cash Payment'}
              </Button>
            </div>
          )}

          {/* Card Payment */}
          {(paymentMethod === 'card' || paymentData?.method === 'card') && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Card Payment</h3>
              
              <div className="space-y-4">
                <Input
                  label="Card Number"
                  type="text"
                  value={cardDetails?.cardNumber}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e?.target?.value }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    type="text"
                    value={cardDetails?.expiryDate}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiryDate: e?.target?.value }))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  <Input
                    label="CVV"
                    type="text"
                    value={cardDetails?.cvv}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e?.target?.value }))}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
                
                <Input
                  label="Cardholder Name"
                  type="text"
                  value={cardDetails?.cardholderName}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, cardholderName: e?.target?.value }))}
                  placeholder="John Doe"
                />
              </div>
              
              <Button
                variant="success"
                fullWidth
                onClick={handleCardPayment}
                disabled={!cardDetails?.cardNumber || !cardDetails?.expiryDate || !cardDetails?.cvv || isProcessing}
                loading={isProcessing}
              >
                {isProcessing ? 'Processing Card...' : `Charge ${formatCurrency(getAmountDue())}`}
              </Button>
            </div>
          )}

          {/* UPI Payment */}
          {(paymentMethod === 'upi' || paymentData?.method === 'upi') && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">UPI Payment</h3>
              
              <div className="bg-muted/20 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">Amount to Pay:</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(getAmountDue())}
                  </span>
                </div>
                
                <Input
                  label="UPI ID"
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e?.target?.value)}
                  placeholder="yourname@upi"
                  className="mb-4"
                />
                
                <div className="text-xs text-muted-foreground mb-4">
                  Enter your UPI ID (e.g., 9876543210@paytm, user@googlepay)
                </div>
              </div>
              
              <Button
                variant="success"
                fullWidth
                onClick={handleUpiPayment}
                disabled={!upiId || isProcessing}
                loading={isProcessing}
              >
                {isProcessing ? 'Processing UPI Payment...' : `Pay ${formatCurrency(getAmountDue())} via UPI`}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Secure payment processing
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Shield" size={16} className="text-success" />
            <span className="text-sm text-success">SSL Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;