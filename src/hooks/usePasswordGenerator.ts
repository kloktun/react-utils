interface Props {
    length?: number;
    chars?: string;
}

export const usePasswordGenerator = () => ((props?: Props) => {

    const chars = props?.chars ?? "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let length = props?.length ?? 12;
    let password = "";

    for (let i = 0; i <= length; i++) {
        let randomNumber = Math.floor(Math.random() * chars.length);
        password += chars.substring(randomNumber, randomNumber +1);
    }

    return password;

});