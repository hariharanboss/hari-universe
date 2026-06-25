import Sun from './Sun';
import Mercury from './Mercury';
import Venus from './Venus';
import Earth from './Earth';
import Mars from './Mars';
import AsteroidBelt from './AsteroidBelt';
import Jupiter from './Jupiter';
import Saturn from './Saturn';
import Uranus from './Uranus';
import Neptune from './Neptune';

export default function SolarSystem() {
  return (
    <group>
      <Sun />
      <Mercury />
      <Venus />
      <Earth />
      <Mars />
      <AsteroidBelt />
      <Jupiter />
      <Saturn />
      <Uranus />
      <Neptune />
    </group>
  );
}
