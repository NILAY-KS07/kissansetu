class ProviderUnavailable(Exception):
    pass


class MspProvider:
    def rates(self):
        raise ProviderUnavailable("MSP provider is not configured.")


class PaymentProvider:
    def status(self, reference):
        raise ProviderUnavailable("Payment provider is not configured.")