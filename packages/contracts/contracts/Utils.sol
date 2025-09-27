// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@quant-finance/solidity-datetime/contracts/DateTime.sol";

library Utils {
    using Strings for uint256;

    function _to2DigitString(
        uint256 value
    ) internal pure returns (bytes memory) {
        return
            value < 10
                ? abi.encodePacked("0", value.toString())
                : abi.encodePacked(value.toString());
    }

    function datetimeString(
        uint256 timestamp,
        int256 _timeDifferenceInSeconds,
        string memory _timeZoneSuffix
    ) internal pure returns (string memory) {
        (
            uint256 year,
            uint256 month,
            uint256 day,
            uint256 hour,
            uint256 minute,
            uint256 second
        ) = DateTime.timestampToDateTime(
                uint256(int256(timestamp) + _timeDifferenceInSeconds)
            );

        return
            string(
                abi.encodePacked(
                    year.toString(),
                    "-",
                    _to2DigitString(month),
                    "-",
                    _to2DigitString(day),
                    " ",
                    _to2DigitString(hour),
                    ":",
                    _to2DigitString(minute),
                    ":",
                    _to2DigitString(second),
                    " ",
                    _timeZoneSuffix
                )
            );
    }

    function datetimeStringEncoded(
        uint256 timestamp,
        int256 _timeDifferenceInSeconds,
        string memory _timeZoneSuffix
    ) internal pure returns (string memory) {
        (
            uint256 year,
            uint256 month,
            uint256 day,
            uint256 hour,
            uint256 minute,
            uint256 second
        ) = DateTime.timestampToDateTime(
                uint256(int256(timestamp) + _timeDifferenceInSeconds)
            );

        return
            string(
                abi.encodePacked(
                    year.toString(),
                    "-",
                    _to2DigitString(month),
                    "-",
                    _to2DigitString(day),
                    "%20",
                    _to2DigitString(hour),
                    "%3A",
                    _to2DigitString(minute),
                    "%3A",
                    _to2DigitString(second),
                    "%20",
                    _timeZoneSuffix
                )
            );
    }

    function datetimeStringDoubleEncoded(
        uint256 timestamp,
        int256 _timeDifferenceInSeconds,
        string memory _timeZoneSuffix
    ) internal pure returns (string memory) {
        (
            uint256 year,
            uint256 month,
            uint256 day,
            uint256 hour,
            uint256 minute,
            uint256 second
        ) = DateTime.timestampToDateTime(
                uint256(int256(timestamp) + _timeDifferenceInSeconds)
            );

        return
            string(
                abi.encodePacked(
                    year.toString(),
                    "-",
                    _to2DigitString(month),
                    "-",
                    _to2DigitString(day),
                    "%2520",
                    _to2DigitString(hour),
                    "%253A",
                    _to2DigitString(minute),
                    "%253A",
                    _to2DigitString(second),
                    "%2520",
                    _timeZoneSuffix
                )
            );
    }

    /**
     * @notice Formats a token amount stored with a given fixed-point precision (tokenDecimals)
     *         into a string with thousand separators and a limited number of display decimals.
     *
     * For example, for a token like USDC (tokenDecimals = 6) where you want to show only 2 decimal places:
     * If value = 123456789, then the actual amount is 123.456789 USDC,
     * but this function will format it as "123.45".
     *
     * @param value The token amount as an integer (scaled by 10^tokenDecimals).
     * @param tokenDecimals The number of decimals the token uses (e.g., 6 for USDC).
     * @param displayDecimals The number of fractional digits to display (e.g., 2).
     * @return formatted The formatted string.
     */
    function formatTokenValue(
        uint256 value,
        uint8 tokenDecimals,
        uint8 displayDecimals
    ) internal pure returns (string memory formatted) {
        // Extract the integer portion by dividing by 10^tokenDecimals.
        uint256 integerPart = value / (10 ** tokenDecimals);
        uint256 remainder = value % (10 ** tokenDecimals);

        // Calculate the portion to display: scale the remainder so that it fits into displayDecimals.
        // This effectively truncates (or rounds down) the fractional part for display.
        uint256 displayFraction = (remainder * (10 ** displayDecimals)) /
            (10 ** tokenDecimals);

        // Convert both parts into strings.
        string memory integerStr = _toStringWithCommas(integerPart);
        string memory fractionalStr = _toFixedFraction(
            displayFraction,
            displayDecimals
        );

        return string(abi.encodePacked(integerStr, ".", fractionalStr));
    }

    /**
     * @notice Converts a uint256 to a string with commas inserted as thousand separators.
     * @param value The integer value to convert.
     * @return The formatted string with commas.
     */
    function _toStringWithCommas(
        uint256 value
    ) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits = 0;
        // Count the number of digits.
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        // Compute number of commas: one comma for every group of 3 digits (except possibly the leftmost group).
        uint256 commas = (digits - 1) / 3;
        uint256 totalLength = digits + commas;
        bytes memory buffer = new bytes(totalLength);
        uint256 index = totalLength;
        uint256 digitCount = 0;
        while (value != 0) {
            // Insert a comma after every three digits, except at the beginning.
            if (digitCount == 3) {
                buffer[--index] = bytes1(uint8(44)); // ASCII for comma
                digitCount = 0;
            }
            uint8 digit = uint8(value % 10);
            buffer[--index] = bytes1(uint8(48 + digit)); // ASCII for digit
            value /= 10;
            digitCount++;
        }
        return string(buffer);
    }

    /**
     * @notice Converts the fractional part into a string with a fixed length by padding with leading zeros if necessary.
     * @param fractional The fractional value to format.
     * @param length The desired number of digits in the output (display decimals).
     * @return A string representation of the fractional part with fixed length.
     */
    function _toFixedFraction(
        uint256 fractional,
        uint8 length
    ) internal pure returns (string memory) {
        bytes memory buffer = new bytes(length);
        // Fill the buffer from the rightmost digit to the left.
        for (uint256 i = length; i > 0; i--) {
            buffer[i - 1] = bytes1(uint8(48 + (fractional % 10)));
            fractional /= 10;
        }
        return string(buffer);
    }
}
