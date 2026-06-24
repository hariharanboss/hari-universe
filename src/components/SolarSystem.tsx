import Sun from './Sun';
import Mercury from './Mercury';
import Venus from './Venus';
import Earth from './Earth';
import Mars from './Mars';
import Jupiter from './Jupiter';
import Saturn from './Saturn';

export default function SolarSystem() {
  return (
    <group>
      <Sun />
      <Mercury />
      <Venus />
      <Earth />
      <Mars />
      <Jupiter />
      <Saturn />
    </group>
  );
}
